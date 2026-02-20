import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: rows } = await supabase
    .from("campaign_leads")
    .select("lead_id")
    .eq("campaign_id", id);

  if (!rows?.length) {
    return NextResponse.json({ leads: [] });
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id, email, company_name")
    .eq("user_id", user.id)
    .in("id", rows.map((r) => r.lead_id));

  return NextResponse.json({
    leads: leads ?? [],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await params;
  const body = await request.json();
  const leadId = body.leadId as string;
  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("user_id", user.id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const nextSendAt = new Date();
  nextSendAt.setSeconds(0, 0);

  const { error } = await supabase.from("campaign_leads").upsert(
    {
      campaign_id: campaignId,
      lead_id: leadId,
      sequence_step: 1,
      next_send_at: nextSendAt.toISOString(),
      state: "pending",
    },
    { onConflict: "campaign_id,lead_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
