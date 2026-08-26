import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@/server/remote-control", () => ({
  getRemoteControlStatus: mocks.getStatus,
  startRemoteControl: mocks.start,
  stopRemoteControl: mocks.stop,
}));

import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/remote-control", () => {
  it("returns the current uncached status", async () => {
    mocks.getStatus.mockReturnValue({ status: "inactive" });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "inactive" });
  });

  it("starts and stops remote control through explicit actions", async () => {
    const active = {
      status: "active",
      public_url: "https://phone.trycloudflare.com",
      access_url:
        "https://phone.trycloudflare.com/#notfair-remote=private-token",
      started_at: "2026-07-30T17:00:00.000Z",
    };
    mocks.start.mockResolvedValue(active);
    mocks.stop.mockResolvedValue({ status: "inactive" });

    const startResponse = await POST(request({ action: "start" }));
    expect(startResponse.status).toBe(200);
    expect(mocks.start).toHaveBeenCalledOnce();
    await expect(startResponse.json()).resolves.toEqual(active);

    const stopResponse = await POST(request({ action: "stop" }));
    expect(stopResponse.status).toBe(200);
    expect(mocks.stop).toHaveBeenCalledOnce();
    await expect(stopResponse.json()).resolves.toEqual({ status: "inactive" });
  });

  it("uses a server error status when tunnel startup fails", async () => {
    mocks.start.mockResolvedValue({
      status: "error",
      error: "Cloudflare Tunnel is unavailable.",
    });

    const response = await POST(request({ action: "start" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: "error",
      error: "Cloudflare Tunnel is unavailable.",
    });
  });

  it("rejects unknown and malformed actions without changing state", async () => {
    const unknown = await POST(request({ action: "restart" }));
    expect(unknown.status).toBe(400);

    const malformed = await POST(
      new Request("http://localhost/api/remote-control", {
        method: "POST",
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.stop).not.toHaveBeenCalled();
  });
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/remote-control", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
