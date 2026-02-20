import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/gmail";
import { checkCanSend } from "@/lib/limits";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const messageId = body.messageId as string;
  const subjectOverride = body.subject as string | undefined;
  const bodyTextOverride = body.body_text as string | undefined;
  if (!messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  const canSend = await checkCanSend(supabase, user.id);
  if (!canSend.ok) {
    return NextResponse.json(
      { error: canSend.reason ?? "Cannot send" },
      { status: 403 }
    );
  }

  const { data: message } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .eq("user_id", user.id)
    .single();

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("email")
    .eq("id", message.lead_id)
    .eq("user_id", user.id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { data: integration } = await supabase
    .from("integrations_google")
    .select("refresh_token, email")
    .eq("user_id", user.id)
    .single();

  if (!integration) {
    return NextResponse.json(
      { error: "Gmail not connected. Connect Gmail first." },
      { status: 400 }
    );
  }

  const toEmail = lead.email;
  const fromEmail = integration.email as string;
  const subject = subjectOverride ?? (message.subject as string);
  const bodyText = bodyTextOverride ?? (message.body_text as string);

  try {
    const { messageId: providerMessageId, threadId } = await sendEmail(
      integration.refresh_token as string,
      fromEmail,
      toEmail,
      subject,
      bodyText
    );

    await supabase
      .from("messages")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        thread_id: threadId,
      })
      .eq("id", messageId)
      .eq("user_id", user.id);

    const leadId = message.lead_id as string;
    await supabase
      .from("leads")
      .update({ status: "emailed" })
      .eq("id", leadId)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Send failed";
    await supabase
      .from("messages")
      .update({ status: "failed", error: errorMsg })
      .eq("id", messageId)
      .eq("user_id", user.id);

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
