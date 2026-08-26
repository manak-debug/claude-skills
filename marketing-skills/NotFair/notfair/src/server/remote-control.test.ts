import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import {
  createRemoteProxyServer,
  remoteBootstrapHtml,
} from "@/server/remote-control";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
});

describe("remote-control authentication proxy", () => {
  it("keeps the token in the URL fragment and claims an HttpOnly session", async () => {
    const token = "phone-only-secret";
    const target = createServer((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ path: req.url, host: req.headers.host }));
    });
    servers.push(target);
    const targetPort = await listen(target);

    const proxy = createRemoteProxyServer({
      token,
      target: `http://127.0.0.1:${targetPort}`,
    });
    servers.push(proxy);
    const proxyPort = await listen(proxy);
    const origin = `http://127.0.0.1:${proxyPort}`;

    const locked = await fetch(origin);
    expect(locked.status).toBe(401);
    expect(locked.headers.get("content-security-policy")).toContain(
      "connect-src 'self'",
    );
    expect(await locked.text()).toContain("Securing this device");

    const rejected = await fetch(`${origin}/.notfair-remote/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "wrong" }),
    });
    expect(rejected.status).toBe(401);

    const claimed = await fetch(`${origin}/.notfair-remote/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    expect(claimed.status).toBe(204);
    const cookie = claimed.headers.get("set-cookie");
    expect(cookie).toContain("__Host-notfair_remote=phone-only-secret");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");

    const allowed = await fetch(`${origin}/phone-view?tab=goals`, {
      headers: { cookie: cookie!.split(";")[0] },
    });
    expect(allowed.status).toBe(200);
    await expect(allowed.json()).resolves.toEqual({
      path: "/phone-view?tab=goals",
      host: `127.0.0.1:${proxyPort}`,
    });
  });

  it("bootstraps from a fragment rather than putting the secret in a request", () => {
    const html = remoteBootstrapHtml();
    expect(html).toContain('location.hash.slice(1)');
    expect(html).toContain('params.get("notfair-remote")');
    expect(html).not.toContain("phone-only-secret");
  });
});

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected TCP address");
      }
      resolve(address.port);
    });
  });
}
