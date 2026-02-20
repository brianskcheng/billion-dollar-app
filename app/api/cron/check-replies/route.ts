import { createServiceClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (CRON_SECRET && request.nextUrl.searchParams.get("secret") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: integrations } = await supabase
    .from("integrations_google")
    .select("user_id, refresh_token, email");

  if (!integrations?.length) {
    return NextResponse.json({ processed: 0 });
  }

  const auth = (await import("@/lib/gmail")).getAuthClient();
  let processed = 0;

  for (const int of integrations) {
    try {
      auth.setCredentials({ refresh_token: int.refresh_token });
      const gmail = google.gmail({ version: "v1", auth });

      const { data: outbound } = await supabase
        .from("messages")
        .select("id, lead_id, campaign_id, thread_id, user_id, provider_message_id")
        .eq("user_id", int.user_id)
        .eq("direction", "outbound")
        .in("status", ["sent", "delivered"])
        .not("thread_id", "is", null);

      if (!outbound?.length) continue;

      for (const msg of outbound) {
        const threadId = msg.thread_id as string;
        const { data: thread } = await gmail.users.threads.get({
          userId: "me",
          id: threadId,
          format: "metadata",
          metadataHeaders: ["From", "Date"],
        });

        const messages = thread?.messages ?? [];
        const ourIds = new Set(
          outbound
            .filter((m) => m.thread_id === threadId)
            .map((m) => (m as { provider_message_id?: string }).provider_message_id)
            .filter(Boolean)
        );

        const hasReply = messages.some(
          (m) => m.id && !ourIds.has(m.id) && m.labelIds?.includes("INBOX")
        );

        if (hasReply) {
          const { data: existing } = await supabase
            .from("events_email")
            .select("id")
            .eq("message_id", msg.id)
            .eq("type", "reply_detected")
            .single();

          if (!existing) {
            await supabase.from("events_email").insert({
              user_id: int.user_id,
              message_id: msg.id,
              type: "reply_detected",
            });
            await supabase
              .from("leads")
              .update({ status: "replied" })
              .eq("id", msg.lead_id);
            await supabase
              .from("campaign_leads")
              .update({ state: "replied" })
              .eq("campaign_id", msg.campaign_id)
              .eq("lead_id", msg.lead_id);
            processed++;
          }
        }
      }
    } catch (err) {
      console.error("check-replies", err);
    }
  }

  return NextResponse.json({ processed });
}
