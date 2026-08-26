// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { RemoteControl } from "@/components/remote-control";
import {
  SidebarMenu,
  SidebarProvider,
} from "@/components/ui/sidebar";

const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const fetchMock = vi.fn();
const writeText = vi.fn();

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  };
}

function renderControl() {
  return render(
    <SidebarProvider>
      <SidebarMenu>
        <RemoteControl />
      </SidebarMenu>
    </SidebarProvider>,
  );
}

describe("RemoteControl", () => {
  it("shows a live session, copies its private link, and stops it", async () => {
    const active = {
      status: "active",
      public_url: "https://phone.trycloudflare.com",
      access_url:
        "https://phone.trycloudflare.com/#notfair-remote=private-token",
      started_at: "2026-07-30T17:00:00.000Z",
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(active))
      .mockResolvedValueOnce(jsonResponse({ status: "inactive" }));
    writeText.mockResolvedValue(undefined);

    renderControl();

    const trigger = (await screen.findByLabelText("Remote control active"))
      .closest("button")!;
    fireEvent.click(trigger);

    expect(screen.getByText("Remote control is live")).toBeInTheDocument();
    expect(screen.getByText(active.public_url)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      active.access_url,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy private link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(active.access_url));
    expect(toastSuccess).toHaveBeenCalledWith("Private remote link copied.");

    fireEvent.click(screen.getByRole("button", { name: "Stop remote control" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/remote-control",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "stop" }),
        }),
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith("Remote control stopped.");
    expect(
      screen.getByRole("button", { name: "Activate remote control" }),
    ).toBeInTheDocument();
  });

  it("surfaces an activation failure and allows another attempt", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: "inactive" }))
      .mockResolvedValueOnce(
        jsonResponse({ error: "Cloudflare Tunnel is unavailable." }, false),
      );

    renderControl();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole("button", { name: "Remote control" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Activate remote control" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/remote-control",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      }),
    );
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Cloudflare Tunnel is unavailable.");
    expect(toastError).toHaveBeenCalledWith(
      "Cloudflare Tunnel is unavailable.",
    );
    expect(
      screen.getByRole("button", { name: "Activate remote control" }),
    ).toBeEnabled();
  });
});
