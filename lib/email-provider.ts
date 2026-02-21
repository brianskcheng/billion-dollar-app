import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail as sendGmail } from "@/lib/gmail";
import { sendEmail as sendOutlook } from "@/lib/outlook";

export type EmailIntegration =
  | { provider: "gmail"; email: string; refresh_token: string }
  | { provider: "microsoft"; email: string; refresh_token: string };

export async function getActiveIntegration(
  supabase: SupabaseClient,
  userId: string
): Promise<EmailIntegration | null> {
  const { data: google } = await supabase
    .from("integrations_google")
    .select("email, refresh_token")
    .eq("user_id", userId)
    .single();

  if (google?.refresh_token) {
    return {
      provider: "gmail",
      email: google.email as string,
      refresh_token: google.refresh_token as string,
    };
  }

  const { data: microsoft } = await supabase
    .from("integrations_microsoft")
    .select("email, refresh_token")
    .eq("user_id", userId)
    .single();

  if (microsoft?.refresh_token) {
    return {
      provider: "microsoft",
      email: microsoft.email as string,
      refresh_token: microsoft.refresh_token as string,
    };
  }

  return null;
}

export async function sendEmail(
  integration: EmailIntegration,
  from: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<{ messageId: string; threadId: string }> {
  if (integration.provider === "gmail") {
    return sendGmail(integration.refresh_token, from, to, subject, bodyText);
  }
  return sendOutlook(integration.refresh_token, from, to, subject, bodyText);
}
