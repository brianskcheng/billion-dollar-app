import { createServiceClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { checkConversationForReply } from "@/lib/outlook";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

async function processGoogleReplies(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  int: { user_id: string; refresh_token: string; email: string }
): Promise<number> {
  const auth = (await import("@/lib/gmail")).getAuthClient();
  auth.setCredentials({ refresh_token: int.refresh_token });
  const gmail = google.gmail({ version: "v1", auth });

  const { data: outbound } = await supabase
    .from("messages")
    .select("id, lead_id, campaign_id, thread_id, user_id, provider_message_id")
    .eq("user_id", int.user_id)
    .eq("direction", "outbound")
    .eq("provider", "gmail")
    .in("status", ["sent", "delivered"])
    .not("thread_id", "is", null);

  if (!outbound?.length) return 0;

  let processed = 0;
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
  return processed;
}

async function processMicrosoftReplies(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  int: { user_id: string; refresh_token: string; email: string }
): Promise<number> {
  const { data: outbound } = await supabase
    .from("messages")
    .select("id, lead_id, campaign_id, thread_id, user_id, provider_message_id")
    .eq("user_id", int.user_id)
    .eq("direction", "outbound")
    .eq("provider", "microsoft")
    .in("status", ["sent", "delivered"])
    .not("thread_id", "is", null);

  if (!outbound?.length) return 0;

  let processed = 0;
  const byConversation = new Map<
    string,
    Array<{ id: string; lead_id: string; campaign_id: string; provider_message_id?: string }>
  >();
  for (const m of outbound) {
    const conv = m.thread_id as string;
    if (!byConversation.has(conv)) byConversation.set(conv, []);
    byConversation.get(conv)!.push({
      id: m.id,
      lead_id: m.lead_id,
      campaign_id: m.campaign_id,
      provider_message_id: (m as { provider_message_id?: string }).provider_message_id,
    });
  }

  for (const [conversationId, msgs] of Array.from(byConversation)) {
    const ourIds = new Set<string>(
      msgs
        .map((m: { provider_message_id?: string }) => m.provider_message_id)
        .filter((id): id is string => !!id)
    );
    try {
      const hasReply = await checkConversationForReply(
        int.refresh_token,
        int.email,
        conversationId,
        ourIds
      );
      if (!hasReply) continue;

      const msg = msgs[0];
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
    } catch (err) {
      console.error("check-replies microsoft", err);
    }
  }
  return processed;
}

export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is required in production" }, { status: 401 });
  }
  if (CRON_SECRET && request.nextUrl.searchParams.get("secret") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: googleInts } = await supabase
    .from("integrations_google")
    .select("user_id, refresh_token, email");

  const { data: microsoftInts } = await supabase
    .from("integrations_microsoft")
    .select("user_id, refresh_token, email");

  const integrations = [
    ...(googleInts ?? []),
    ...(microsoftInts ?? []),
  ];

  if (!integrations.length) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const int of googleInts ?? []) {
    try {
      processed += await processGoogleReplies(supabase, int);
    } catch (err) {
      console.error("check-replies google", err);
    }
  }

  for (const int of microsoftInts ?? []) {
    try {
      processed += await processMicrosoftReplies(supabase, int);
    } catch (err) {
      console.error("check-replies microsoft", err);
    }
  }

  return NextResponse.json({ processed });
}
