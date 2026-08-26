"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RadioTower,
  ShieldCheck,
  Square,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type RemoteStatus =
  | { status: "inactive" }
  | { status: "starting" }
  | {
      status: "active";
      public_url: string;
      access_url: string;
      started_at: string;
    }
  | { status: "error"; error: string };

export function RemoteControl() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RemoteStatus>({ status: "inactive" });
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/remote-control", { cache: "no-store" })
      .then((response) => response.json() as Promise<RemoteStatus>)
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function update(action: "start" | "stop") {
    setWorking(true);
    if (action === "start") setStatus({ status: "starting" });
    try {
      const response = await fetch("/api/remote-control", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const next = (await response.json()) as RemoteStatus | { error: string };
      if (!response.ok || !("status" in next)) {
        throw new Error(
          "error" in next ? next.error : "Could not change remote control.",
        );
      }
      setStatus(next);
      if (next.status === "error") toast.error(next.error);
      if (action === "stop") toast.success("Remote control stopped.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ status: "error", error: message });
      toast.error(message);
    } finally {
      setWorking(false);
    }
  }

  async function copyLink() {
    if (status.status !== "active") return;
    await navigator.clipboard.writeText(status.access_url);
    setCopied(true);
    toast.success("Private remote link copied.");
    setTimeout(() => setCopied(false), 2_000);
  }

  const active = status.status === "active";
  const starting = status.status === "starting" || (working && !active);

  return (
    <SidebarMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <SidebarMenuButton tooltip="Remote control">
            <RadioTower />
            <span>Remote control</span>
            {active && (
              <span
                className="ml-auto size-2 rounded-full bg-[hsl(var(--notfair-accent))]"
                aria-label="Remote control active"
              />
            )}
          </SidebarMenuButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RadioTower className="size-5" />
              Remote control
            </DialogTitle>
            <DialogDescription>
              Open this NotFair portal securely from your phone or another
              computer while this Mac stays online.
            </DialogDescription>
          </DialogHeader>

          {active ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-[hsl(var(--notfair-accent-soft))] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--notfair-accent))]">
                  <span className="size-2 rounded-full bg-current" />
                  Remote control is live
                </div>
                <p className="mt-2 break-all text-xs text-[hsl(var(--notfair-ink-3))]">
                  {status.public_url}
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-[hsl(var(--notfair-surface-2))] p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[hsl(var(--notfair-accent))]" />
                <p className="text-sm leading-5 text-[hsl(var(--notfair-ink-3))]">
                  The private link signs one browser in. Treat it like a
                  password: anyone with it can operate your NotFair workspace.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={copyLink}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy private link"}
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={status.access_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink />
                    Open
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-[hsl(var(--notfair-warn-soft))] p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[hsl(var(--notfair-warn))]" />
                <p className="text-sm leading-5 text-[hsl(var(--notfair-ink-3))]">
                  Activation creates a temporary Cloudflare tunnel. The
                  private access token stays in the link fragment and is
                  exchanged for a secure browser cookie.
                </p>
              </div>
              {status.status === "error" && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {status.error}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {active ? (
              <Button
                variant="destructive"
                onClick={() => void update("stop")}
                disabled={working}
              >
                {working ? <Loader2 className="animate-spin" /> : <Square />}
                Stop remote control
              </Button>
            ) : (
              <Button
                onClick={() => void update("start")}
                disabled={starting}
              >
                {starting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RadioTower />
                )}
                {starting ? "Creating secure link…" : "Activate remote control"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  );
}
