import { createClient } from "@/lib/supabase/server";
import { getOpenAI, parseJsonResponse } from "@/lib/openai";
import {
  FIRST_OUTREACH_SYSTEM,
  firstOutreachUser,
  FOLLOWUP_SYSTEM,
  followupUser,
} from "@/lib/prompts";
import { NextResponse } from "next/server";

type GenerateInput = {
  subject?: string;
  body_text?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const leadId = body.leadId as string;
  const campaignId = body.campaignId as string | null;
  const step = (body.step as number) ?? 1;

  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 });
  }

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
  const valueProp =
    "We place pre-vetted candidates fast (7-10 days) without wasting your time.";
  const offer =
    "15-min call + we'll share 3 candidate profiles relevant to you.";

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
      provider: "gmail",
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
