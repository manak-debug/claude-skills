import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { Socket } from "node:net";
import type { Duplex } from "node:stream";

const COOKIE_NAME = "__Host-notfair_remote";
const CLAIM_PATH = "/.notfair-remote/claim";
const START_TIMEOUT_MS = 30_000;
const MAX_CLAIM_BYTES = 4_096;

export type RemoteControlStatus =
  | { status: "inactive" }
  | { status: "starting" }
  | {
      status: "active";
      public_url: string;
      access_url: string;
      started_at: string;
    }
  | { status: "error"; error: string };

type RemoteRuntime = {
  state: RemoteControlStatus;
  token: string | null;
  proxy: Server | null;
  tunnel: ChildProcessWithoutNullStreams | null;
  startPromise: Promise<RemoteControlStatus> | null;
  stopping: boolean;
  hooksRegistered: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __notfairRemoteControlRuntime: RemoteRuntime | undefined;
}

function runtime(): RemoteRuntime {
  if (!globalThis.__notfairRemoteControlRuntime) {
    globalThis.__notfairRemoteControlRuntime = {
      state: { status: "inactive" },
      token: null,
      proxy: null,
      tunnel: null,
      startPromise: null,
      stopping: false,
      hooksRegistered: false,
    };
  }
  return globalThis.__notfairRemoteControlRuntime;
}

/**
 * Start an authenticated Cloudflare Quick Tunnel to this NotFair process.
 *
 * The access token lives in the URL fragment, so browsers never send it to
 * Cloudflare. A tiny local reverse proxy exchanges it for a secure HttpOnly
 * cookie before forwarding any NotFair request.
 */
export async function startRemoteControl(): Promise<RemoteControlStatus> {
  const rt = runtime();
  if (rt.state.status === "active") return rt.state;
  if (rt.startPromise) return rt.startPromise;

  rt.state = { status: "starting" };
  rt.startPromise = startRuntime(rt).finally(() => {
    rt.startPromise = null;
  });
  return rt.startPromise;
}

export function getRemoteControlStatus(): RemoteControlStatus {
  const rt = runtime();
  if (
    rt.state.status === "active" &&
    (!rt.tunnel || rt.tunnel.exitCode !== null)
  ) {
    rt.state = {
      status: "error",
      error: "The remote tunnel stopped unexpectedly. Activate it again.",
    };
  }
  return rt.state;
}

export async function stopRemoteControl(): Promise<RemoteControlStatus> {
  const rt = runtime();
  rt.stopping = true;
  const tunnel = rt.tunnel;
  const proxy = rt.proxy;
  rt.tunnel = null;
  rt.proxy = null;
  rt.token = null;

  if (tunnel && tunnel.exitCode === null) {
    tunnel.kill("SIGTERM");
    const exited = await waitForExit(tunnel, 3_000);
    if (!exited && tunnel.exitCode === null) tunnel.kill("SIGKILL");
  }
  if (proxy) {
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }

  rt.stopping = false;
  rt.state = { status: "inactive" };
  return rt.state;
}

async function startRuntime(rt: RemoteRuntime): Promise<RemoteControlStatus> {
  const cloudflared = findCloudflaredBinary();
  if (!cloudflared) {
    return setError(
      rt,
      "Cloudflare Tunnel is required. Install it with `brew install cloudflared`, then try again.",
    );
  }

  registerShutdownHooks(rt);
  rt.token = randomBytes(32).toString("base64url");

  try {
    const targetPort = process.env.PORT?.trim() || "3326";
    rt.proxy = createRemoteProxyServer({
      token: rt.token,
      target: `http://127.0.0.1:${targetPort}`,
    });
    const proxyPort = await listenOnLoopback(rt.proxy);

    const tunnel = spawn(
      cloudflared,
      [
        "tunnel",
        "--no-autoupdate",
        "--url",
        `http://127.0.0.1:${proxyPort}`,
      ],
      {
        cwd: homedir(),
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    tunnel.stdin.end();
    rt.tunnel = tunnel;
    tunnel.on("exit", () => {
      if (rt.tunnel !== tunnel || rt.stopping) return;
      rt.tunnel = null;
      rt.token = null;
      const proxy = rt.proxy;
      rt.proxy = null;
      proxy?.close();
      rt.state = {
        status: "error",
        error: "The remote tunnel stopped unexpectedly. Activate it again.",
      };
    });

    const publicUrl = await waitForQuickTunnelUrl(tunnel);
    const startedAt = new Date().toISOString();
    rt.state = {
      status: "active",
      public_url: publicUrl,
      access_url: `${publicUrl}/#notfair-remote=${encodeURIComponent(rt.token)}`,
      started_at: startedAt,
    };
    return rt.state;
  } catch (error) {
    if (rt.tunnel?.exitCode === null) rt.tunnel.kill("SIGTERM");
    rt.tunnel = null;
    rt.token = null;
    const proxy = rt.proxy;
    rt.proxy = null;
    proxy?.close();
    return setError(rt, error instanceof Error ? error.message : String(error));
  }
}

function setError(rt: RemoteRuntime, error: string): RemoteControlStatus {
  rt.state = { status: "error", error };
  return rt.state;
}

export function createRemoteProxyServer(args: {
  token: string;
  target: string;
}): Server {
  const target = new URL(args.target);
  const tokenDigest = digest(args.token);

  const server = createServer((req, res) => {
    void handleProxyRequest(req, res, target, tokenDigest);
  });

  server.on("upgrade", (req, socket, head) => {
    if (!authorized(req, tokenDigest)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    proxyUpgrade(req, socket, head, target);
  });

  return server;
}

async function handleProxyRequest(
  req: IncomingMessage,
  res: ServerResponse,
  target: URL,
  tokenDigest: Buffer,
): Promise<void> {
  if (req.url?.split("?")[0] === CLAIM_PATH && req.method === "POST") {
    await claimRemoteSession(req, res, tokenDigest);
    return;
  }

  if (!authorized(req, tokenDigest)) {
    if (req.method === "GET" || req.method === "HEAD") {
      const html = remoteBootstrapHtml();
      res.writeHead(401, {
        "content-type": "text/html; charset=utf-8",
        "content-length": Buffer.byteLength(html),
        "cache-control": "no-store",
        "content-security-policy":
          "default-src 'none'; connect-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : html);
    } else {
      res.writeHead(401, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify({ error: "Remote control authorization required" }));
    }
    return;
  }

  const upstream = await import("node:http");
  const proxyReq = upstream.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: req.method,
      path: req.url,
      headers: forwardedHeaders(req),
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end(`NotFair is not available: ${error.message}`);
  });
  req.pipe(proxyReq);
}

async function claimRemoteSession(
  req: IncomingMessage,
  res: ServerResponse,
  tokenDigest: Buffer,
): Promise<void> {
  try {
    const body = await readSmallBody(req);
    const parsed = JSON.parse(body) as { token?: unknown };
    if (
      typeof parsed.token !== "string" ||
      !safeEqual(digest(parsed.token), tokenDigest)
    ) {
      res.writeHead(401, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify({ ok: false }));
      return;
    }
    res.writeHead(204, {
      "set-cookie": `${COOKIE_NAME}=${parsed.token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    });
    res.end();
  } catch {
    res.writeHead(400, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify({ ok: false }));
  }
}

function proxyUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  target: URL,
): void {
  const upstream = new Socket();
  upstream.connect(Number(target.port || 80), target.hostname, () => {
    const requestLine = `${req.method ?? "GET"} ${req.url ?? "/"} HTTP/${req.httpVersion}\r\n`;
    const headers = Object.entries(forwardedHeaders(req))
      .flatMap(([name, value]) =>
        Array.isArray(value)
          ? value.map((entry) => `${name}: ${entry}\r\n`)
          : value === undefined
            ? []
            : [`${name}: ${value}\r\n`],
      )
      .join("");
    upstream.write(`${requestLine}${headers}\r\n`);
    if (head.length > 0) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
}

function forwardedHeaders(req: IncomingMessage): IncomingMessage["headers"] {
  const headers = { ...req.headers };
  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress) {
    headers["x-forwarded-for"] = headers["x-forwarded-for"]
      ? `${headers["x-forwarded-for"]}, ${remoteAddress}`
      : remoteAddress;
  }
  headers["x-forwarded-proto"] = "https";
  return headers;
}

function authorized(req: IncomingMessage, tokenDigest: Buffer): boolean {
  const value = parseCookies(req.headers.cookie ?? "")[COOKIE_NAME];
  return typeof value === "string" && safeEqual(digest(value), tokenDigest);
}

function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    cookies[name] = value;
  }
  return cookies;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readSmallBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_CLAIM_BYTES) throw new Error("Claim body too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function remoteBootstrapHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>NotFair Remote Control</title>
  <style>
    :root{color-scheme:light dark;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101012;color:#ececee}
    main{width:min(360px,calc(100% - 40px));padding:28px;border-radius:16px;background:#202024;box-shadow:0 24px 70px #0008}
    h1{font-size:20px;margin:0 0 10px}p{font-size:14px;line-height:1.5;color:#a6a6ad;margin:0}
    .dot{display:inline-block;width:9px;height:9px;margin-right:8px;border-radius:50%;background:#4caf6e}
    .error{color:#f87171}
  </style>
</head>
<body>
  <main>
    <h1><span class="dot"></span>NotFair Remote Control</h1>
    <p id="status">Securing this device…</p>
  </main>
  <script>
    (() => {
      const status = document.getElementById("status");
      const params = new URLSearchParams(location.hash.slice(1));
      const token = params.get("notfair-remote");
      if (!token) {
        status.textContent = "This link is incomplete. Copy a fresh access link from NotFair on your Mac.";
        status.className = "error";
        return;
      }
      fetch("${CLAIM_PATH}", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({token})
      }).then((response) => {
        if (!response.ok) throw new Error("expired");
        history.replaceState(null, "", location.pathname + location.search);
        location.reload();
      }).catch(() => {
        status.textContent = "This remote link has expired. Activate Remote control again on your Mac.";
        status.className = "error";
      });
    })();
  </script>
</body>
</html>`;
}

function findCloudflaredBinary(): string | null {
  const explicit = process.env.NOTFAIR_CLOUDFLARED_BIN?.trim();
  if (explicit) return existsSync(explicit) ? explicit : null;

  const candidates = [
    ...(process.env.PATH ?? "")
      .split(delimiter)
      .filter(Boolean)
      .map((dir) => join(dir, "cloudflared")),
    "/opt/homebrew/bin/cloudflared",
    "/usr/local/bin/cloudflared",
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function listenOnLoopback(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not open the remote-control proxy."));
        return;
      }
      resolve(address.port);
    });
  });
}

function waitForQuickTunnelUrl(
  child: ChildProcessWithoutNullStreams,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let output = "";
    const finish = (error: Error | null, url?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("error", onError);
      child.off("exit", onExit);
      if (error) reject(error);
      else resolve(url!);
    };
    const consume = (chunk: Buffer | string) => {
      output = (output + chunk.toString()).slice(-16_384);
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match) finish(null, match[0]);
    };
    const onError = (error: Error) => finish(error);
    const onExit = (code: number | null) =>
      finish(
        new Error(
          `Cloudflare Tunnel exited before it created a URL (code ${code ?? "unknown"}).`,
        ),
      );
    child.stdout.on("data", consume);
    child.stderr.on("data", consume);
    child.once("error", onError);
    child.once("exit", onExit);
    const timer = setTimeout(() => {
      finish(
        new Error(
          "Cloudflare Tunnel did not create a public URL within 30 seconds. Check your network and try again.",
        ),
      );
    }, START_TIMEOUT_MS);
    timer.unref();
  });
}

function waitForExit(
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number,
): Promise<boolean> {
  if (child.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    timer.unref();
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

function registerShutdownHooks(rt: RemoteRuntime): void {
  if (rt.hooksRegistered) return;
  rt.hooksRegistered = true;
  const shutdown = () => {
    rt.stopping = true;
    if (rt.tunnel?.exitCode === null) rt.tunnel.kill("SIGTERM");
    rt.proxy?.close();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.once("exit", shutdown);
}
