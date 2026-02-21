import { createClient } from "@/lib/supabase/server";
import { getTokensFromCode } from "@/lib/outlook";
import { Client } from "@microsoft/microsoft-graph-client";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const errorParam = request.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL("/dashboard?email_error=" + encodeURIComponent(errorParam), request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?email_error=no_code", request.url)
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

    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });
    const profile = await client.api("/me").select("mail,userPrincipalName").get();
    const email =
      (profile.mail as string) ?? (profile.userPrincipalName as string) ?? "";

    await supabase.from("integrations_microsoft").upsert(
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
      new URL("/dashboard?email_connected=1", request.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL("/dashboard?email_error=" + encodeURIComponent(message), request.url)
    );
  }
}
