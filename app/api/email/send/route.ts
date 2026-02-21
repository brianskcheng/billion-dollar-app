import { requireAuth } from "@/lib/auth";
import { getActiveIntegration, sendEmail } from "@/lib/email-provider";
import { checkCanSend } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";
import { parseBody, emailSendSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuth(supabase);
  if (auth.response) return auth.response;
  const user = auth.user;

  const parsed = await parseBody(emailSendSchema, request);
  if (parsed.error) return parsed.error;
  const { messageId, subject: subjectOverride, body_text: bodyTextOverride } =
    parsed.data;

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

  const integration = await getActiveIntegration(supabase, user.id);

  if (!integration) {
    return NextResponse.json(
      { error: "Connect your email first." },
      { status: 400 }
    );
  }

  const toEmail = lead.email;
  const fromEmail = integration.email;
  const subject = subjectOverride ?? (message.subject as string);
  const bodyText = bodyTextOverride ?? (message.body_text as string);

  try {
    const { messageId: providerMessageId, threadId } = await sendEmail(
      integration,
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
