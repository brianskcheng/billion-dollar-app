import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export function getAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required");
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/google/oauth/callback`
  );
}

export function getAuthUrl() {
  const auth = getAuthClient();
  return auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function getTokensFromCode(code: string) {
  const auth = getAuthClient();
  const { tokens } = await auth.getToken(code);
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };
}

export async function sendEmail(
  refreshToken: string,
  fromEmail: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<{ messageId: string; threadId: string }> {
  const auth = getAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: "v1", auth });

  const raw = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    bodyText,
    "",
    "---",
    "Reply STOP to unsubscribe.",
  ].join("\r\n");

  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
    },
  });

  return {
    messageId: res.data.id!,
    threadId: res.data.threadId ?? res.data.id!,
  };
}
