export const FIRST_OUTREACH_SYSTEM = `You are an expert B2B sales copywriter. Write short, natural emails that sound human, avoid spammy phrases, and get replies. Do not use marketing fluff. No emojis. No exclamation marks. Keep it under 120 words.`;

export function firstOutreachUser(vars: {
  niche: string;
  senderCompany: string;
  valueProp: string;
  offer: string;
  leadCompany: string;
  leadContactName: string | null;
  leadWebsite: string | null;
  leadIndustry: string | null;
  leadLocation: string | null;
}) {
  return `Write a cold email for this business lead.

Sender business:
Niche: ${vars.niche}
Company: ${vars.senderCompany}
What we sell (value prop): ${vars.valueProp}
Offer/CTA: ${vars.offer} (ask for a 15-min chat)

Lead:
Company name: ${vars.leadCompany}
Contact name (may be empty): ${vars.leadContactName ?? "N/A"}
Website: ${vars.leadWebsite ?? "N/A"}
Industry: ${vars.leadIndustry ?? "N/A"}
Location: ${vars.leadLocation ?? "N/A"}

Rules:
If contact name is empty, use "Hi there,"
Make 1 specific observation about their business based on their website/industry (do not invent facts; infer cautiously)
Use a soft CTA ("Worth a quick chat?")
Output JSON only: { "subject": "...", "body_text": "..." }`;
}

export const FOLLOWUP_SYSTEM = `You write concise follow-ups that feel polite and non-pushy. Under 70 words.`;

export function followupUser(subject: string, bodyText: string) {
  return `Write a follow-up to this email. Keep it short.

Original email:
Subject: ${subject}
Body:
${bodyText}

Rules:
Do not repeat the whole pitch
Ask a simple yes/no question
Output JSON only: { "subject": "...", "body_text": "..." }`;
}

export const REPLY_ASSIST_SYSTEM = `You are an assistant that drafts replies to inbound leads. Keep it crisp, helpful, and human.`;

export function replyAssistUser(vars: {
  niche: string;
  valueProp: string;
  offer: string;
  inboundText: string;
}) {
  return `Draft a reply email.

My business:
Niche: ${vars.niche}
Value prop: ${vars.valueProp}
Offer: ${vars.offer}

Inbound email from lead:
${vars.inboundText}

Rules:
Answer questions directly
Propose 2 time slots in the next 5 business days
Include one clarifying question
Output JSON only: { "subject": "...", "body_text": "..." }`;
}
