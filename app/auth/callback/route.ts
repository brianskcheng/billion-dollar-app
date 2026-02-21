import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=" + encodeURIComponent("No auth code received"), requestUrl.origin)
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  const session = data.session;
  const user = data.user;
  if (!session || !user) {
    return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
  }

  const provider = (session as { provider?: string }).provider;
  const providerToken = (session as { provider_token?: string }).provider_token;
  const providerRefreshToken = (session as { provider_refresh_token?: string }).provider_refresh_token;
  const email = user.email ?? "";

  if (provider === "google" && providerToken && providerRefreshToken) {
    await supabase.from("integrations_google").upsert(
      {
        user_id: user.id,
        access_token: providerToken,
        refresh_token: providerRefreshToken,
        expiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } else if (provider === "azure" && providerToken && providerRefreshToken) {
    await supabase.from("integrations_microsoft").upsert(
      {
        user_id: user.id,
        access_token: providerToken,
        refresh_token: providerRefreshToken,
        expiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
