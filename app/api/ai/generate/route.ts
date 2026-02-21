import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOpenAI, parseJsonResponse } from "@/lib/openai";
import {
  FIRST_OUTREACH_SYSTEM,
  firstOutreachUser,
  FOLLOWUP_SYSTEM,
  followupUser,
} from "@/lib/prompts";
import { DEFAULT_OFFER, DEFAULT_VALUE_PROP } from "@/lib/defaults";
import { getActiveIntegration } from "@/lib/email-provider";
import { parseBody, aiGenerateSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

type GenerateInput = {
  subject?: string;
  body_text?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuth(supabase);
  if (auth.response) return auth.response;
  const user = auth.user;

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const parsed = await parseBody(aiGenerateSchema, request);
  if (parsed.error) return parsed.error;
  const { leadId, campaignId, step: stepRaw } = parsed.data;
  const step = stepRaw ?? 1;

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("user_id", user.id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, niche")
    .eq("id", user.id)
    .single();

  const companyName = (profile?.company_name as string) ?? "Our company";
  const niche = (profile?.niche as string) ?? "Recruitment agencies selling to SMEs";
  const valueProp = DEFAULT_VALUE_PROP;
  const offer = DEFAULT_OFFER;

  let campaignValueProp = valueProp;
  let campaignOffer = offer;
  if (campaignId) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("value_prop, offer")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();
    if (campaign) {
      campaignValueProp = (campaign.value_prop as string) || valueProp;
      campaignOffer = (campaign.offer as string) || offer;
    }
  }

  const openai = getOpenAI();
  let result: GenerateInput;

  if (step === 1) {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: FIRST_OUTREACH_SYSTEM },
        {
          role: "user",
          content: firstOutreachUser({
            niche,
            senderCompany: companyName,
            valueProp: campaignValueProp,
            offer: campaignOffer,
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
    result = parseJsonResponse<GenerateInput>(text);
  } else {
    const { data: prevMessage } = await supabase
      .from("messages")
      .select("subject, body_text")
      .eq("lead_id", leadId)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!prevMessage) {
      return NextResponse.json(
        { error: "No previous message found for follow-up" },
        { status: 400 }
      );
    }

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: FOLLOWUP_SYSTEM },
        {
          role: "user",
          content: followupUser(
            prevMessage.subject as string,
            prevMessage.body_text as string
          ),
        },
      ],
    });
    const text = res.choices[0]?.message?.content ?? "";
    result = parseJsonResponse<GenerateInput>(text);
  }

  const integration = await getActiveIntegration(supabase, user.id);

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      campaign_id: campaignId || null,
      lead_id: leadId,
      direction: "outbound",
      subject: result.subject ?? "Quick question",
      body_text: result.body_text ?? "",
      status: "queued",
      ...(integration && { provider: integration.provider }),
      meta: { step, model: "gpt-4o-mini" },
    })
    .select("id, subject, body_text")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messageId: message.id,
    subject: message.subject,
    body_text: message.body_text,
  });
}
