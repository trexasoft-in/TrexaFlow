import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET(request: NextRequest) {
  const centralBase = env.centralAuthAppUrl
  const returnTo = request.nextUrl.searchParams.get("returnTo") || request.nextUrl.origin

  if (!centralBase) {
    console.error("[Auth Confirm Route] centralAuthAppUrl is not configured. Cannot redirect to TrexaSoft CentralAuth.");
    return new NextResponse(
      "Configuration Error: centralAuthAppUrl is not configured. Please check environment variables.",
      { status: 500 }
    );
  }

  const target = `${centralBase}/auth/login?returnTo=${encodeURIComponent(returnTo)}`
  return NextResponse.redirect(new URL(target))
}
