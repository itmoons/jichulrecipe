import { NextRequest, NextResponse } from "next/server";

const OFFICIAL_HOST = "www.jiculrecipe.com";
const LEGACY_HOST = "jichulrecipe.vercel.app";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (host !== LEGACY_HOST) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = OFFICIAL_HOST;
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: "/:path*" };
