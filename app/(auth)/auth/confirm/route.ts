import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const centralBase = process.env.NEXT_PUBLIC_CENTRALAUTH_APP_URL?.replace(/\/$/, "")
  const returnTo = request.nextUrl.searchParams.get("returnTo") || request.nextUrl.origin

  if (!centralBase) {
    return NextResponse.redirect(new URL("/auth", request.url))
  }

  const target = `${centralBase}/auth/login?returnTo=${encodeURIComponent(returnTo)}`
  return NextResponse.redirect(target)
}
