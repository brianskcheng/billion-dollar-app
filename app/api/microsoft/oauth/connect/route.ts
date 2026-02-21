import { getAuthUrl } from "@/lib/outlook";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const encoded = encodeURIComponent(
      msg.includes("MICROSOFT_CLIENT") || msg.includes("required")
        ? "Configure Microsoft OAuth in Supabase Dashboard and add the same credentials to .env. See docs/SETUP_MICROSOFT.md."
        : msg
    );
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${base}/dashboard?email_error=${encoded}`);
  }
}
