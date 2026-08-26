import { NextResponse } from "next/server";

import {
  getRemoteControlStatus,
  startRemoteControl,
  stopRemoteControl,
} from "@/server/remote-control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getRemoteControlStatus(), {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: unknown };
  if (body.action === "start") {
    const status = await startRemoteControl();
    return NextResponse.json(status, {
      status: status.status === "error" ? 500 : 200,
      headers: { "cache-control": "no-store" },
    });
  }
  if (body.action === "stop") {
    return NextResponse.json(await stopRemoteControl(), {
      headers: { "cache-control": "no-store" },
    });
  }
  return NextResponse.json(
    { error: "action must be `start` or `stop`" },
    { status: 400 },
  );
}
