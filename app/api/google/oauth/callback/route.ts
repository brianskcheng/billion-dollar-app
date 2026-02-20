import { createClient } from "@/lib/supabase/server";
import { getTokensFromCode } from "@/lib/gmail";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const errorParam = request.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL("/dashboard?gmail_error=" + encodeURIComponent(errorParam), request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?gmail_error=no_code", request.url)
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?redirect=/dashboard", request.url)
    );
  }

  try {
    const { accessToken, refreshToken, expiry } =
      await getTokensFromCode(code);

    const auth = (await import("@/lib/gmail")).getAuthClient();
    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    const gmail = google.gmail({ version: "v1", auth });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress ?? "";

    await supabase.from("integrations_google").upsert(
      {
        user_id: user.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry: expiry?.toISOString() ?? null,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(
      new URL("/dashboard?gmail_connected=1", request.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL("/dashboard?gmail_error=" + encodeURIComponent(message), request.url)
    );
  }
}
