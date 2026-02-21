import { createServiceClient } from "@/lib/supabase/server";
import { getOpenAI, parseJsonResponse } from "@/lib/openai";
import {
  FIRST_OUTREACH_SYSTEM,
  firstOutreachUser,
  FOLLOWUP_SYSTEM,
  followupUser,
} from "@/lib/prompts";
import { DEFAULT_OFFER, DEFAULT_VALUE_PROP } from "@/lib/defaults";
import { getActiveIntegration, sendEmail } from "@/lib/email-provider";
import { checkCanSend } from "@/lib/limits";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is required in production" }, { status: 401 });
  }
  if (CRON_SECRET && request.nextUrl.searchParams.get("secret") !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const { data: dueRows } = await supabase
    .from("campaign_leads")
    .select("campaign_id, lead_id, sequence_step")
    .in("state", ["pending", "sent"])
    .lte("next_send_at", now)
    .limit(20);

  if (!dueRows?.length) {
    return NextResponse.json({ processed: 0 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let processed = 0;
  for (const row of dueRows) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, user_id, daily_send_limit, status, value_prop, offer")
      .eq("id", row.campaign_id)
      .single();

    if (!campaign || campaign.status !== "running") continue;

    const canSend = await checkCanSend(supabase, campaign.user_id);
    if (!canSend.ok) continue;

    const { count: sentToday } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", campaign.user_id)
      .eq("direction", "outbound")
      .in("status", ["sent", "delivered"])
      .gte("created_at", todayStart.toISOString());

    if ((sentToday ?? 0) >= (campaign.daily_send_limit ?? 10)) continue;

    const integration = await getActiveIntegration(supabase, campaign.user_id);

    if (!integration) continue;

    const { data: lead } = await supabase
      .from("leads")
      .select("email, company_name, contact_name, website, industry, location")
      .eq("id", row.lead_id)
      .single();

    if (!lead) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, niche")
      .eq("id", campaign.user_id)
      .single();

    const valueProp =
      (campaign.value_prop as string) ?? DEFAULT_VALUE_PROP;
    const offer =
      (campaign.offer as string) ?? DEFAULT_OFFER;

    let subject: string;
    let bodyText: string;

    if (row.sequence_step === 1) {
      const openai = getOpenAI();
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: FIRST_OUTREACH_SYSTEM },
          {
            role: "user",
            content: firstOutreachUser({
              niche: (profile?.niche as string) ?? "Recruitment agencies",
              senderCompany: (profile?.company_name as string) ?? "Our company",
              valueProp,
              offer,
              leadCompany: (lead.company_name as string) ?? lead.email,
              leadContactName: lead.contact_name as string | null,
              leadWebsite: lead.website as string | null,
              leadIndustry: lead.industry as string | null,
              leadLocation: lead.location as string | null,
            }),
          },
        ],
      });
      const text = res.choices[0]?.message?.content ?? "";
      const parsed = parseJsonResponse<{ subject: string; body_text: string }>(text);
      subject = parsed.subject ?? "Quick question";
      bodyText = parsed.body_text ?? "";
    } else {
      const { data: prevMsg } = await supabase
        .from("messages")
        .select("subject, body_text")
        .eq("lead_id", row.lead_id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!prevMsg) continue;

      const openai = getOpenAI();
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: FOLLOWUP_SYSTEM },
          {
            role: "user",
            content: followupUser(
              prevMsg.subject as string,
              prevMsg.body_text as string
            ),
          },
        ],
      });
      const text = res.choices[0]?.message?.content ?? "";
      const parsed = parseJsonResponse<{ subject: string; body_text: string }>(text);
      subject = parsed.subject ?? "Re: " + (prevMsg.subject as string);
      bodyText = parsed.body_text ?? "";
    }

    bodyText += "\n\n---\nReply STOP to unsubscribe.";

    try {
      const { messageId: providerMessageId, threadId } = await sendEmail(
        integration,
        integration.email,
        lead.email as string,
        subject,
        bodyText
      );

      await supabase.from("messages").insert({
        user_id: campaign.user_id,
        campaign_id: row.campaign_id,
        lead_id: row.lead_id,
        direction: "outbound",
        subject,
        body_text: bodyText,
        provider: integration.provider,
        provider_message_id: providerMessageId,
        thread_id: threadId,
        status: "sent",
      });

      const nextStep = row.sequence_step + 1;
      const nextSend = new Date();
      if (nextStep === 2) nextSend.setDate(nextSend.getDate() + 3);
      else if (nextStep === 3) nextSend.setDate(nextSend.getDate() + 4);
      else continue;

      await supabase
        .from("campaign_leads")
        .update({
          state: "sent",
          sequence_step: nextStep,
          next_send_at: nextSend.toISOString(),
          last_sent_at: now,
        })
        .eq("campaign_id", row.campaign_id)
        .eq("lead_id", row.lead_id);

      await supabase
        .from("leads")
        .update({ status: "emailed" })
        .eq("id", row.lead_id);

      processed++;
    } catch (err) {
      console.error("send-due", err);
    }
  }

  return NextResponse.json({ processed });
}
