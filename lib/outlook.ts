import { Client } from "@microsoft/microsoft-graph-client";

const SCOPES = [
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
];

function getClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET required");
  }
  return { clientId, clientSecret };
}

export function getRedirectUri(): string {
  return (
    process.env.MICROSOFT_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/microsoft/oauth/callback`
  );
}

export function getAuthUrl(): string {
  const { clientId } = getClientCredentials();
  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    response_mode: "query",
    prompt: "consent",
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function getTokensFromCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiry: Date | null;
}> {
  const { clientId, clientSecret } = getClientCredentials();
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
  };

  const expiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiry,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getClientCredentials();

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function sendEmail(
  refreshToken: string,
  fromEmail: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<{ messageId: string; threadId: string }> {
  const accessToken = await refreshAccessToken(refreshToken);
  const client = getGraphClient(accessToken);

  const draft = await client
    .api("/me/messages")
    .post({
      subject,
      body: {
        contentType: "Text",
        content: bodyText,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    }) as { id: string; conversationId?: string };

  const messageId = draft.id;
  const conversationId = draft.conversationId ?? messageId;

  await client
    .api(`/me/messages/${messageId}/send`)
    .post({});

  return { messageId, threadId: conversationId };
}

export async function checkConversationForReply(
  refreshToken: string,
  ourEmail: string,
  conversationId: string,
  ourMessageIds: Set<string>
): Promise<boolean> {
  const accessToken = await refreshAccessToken(refreshToken);
  const client = getGraphClient(accessToken);

  const res = await client
    .api("/me/messages")
    .select("id,from")
    .filter(`conversationId eq '${conversationId}'`)
    .get();

  const messages = (res.value ?? []) as Array<{
    id: string;
    from?: { emailAddress?: { address?: string } };
  }>;

  return messages.some((m) => {
    if (ourMessageIds.has(m.id)) return false;
    const from = m.from?.emailAddress?.address ?? "";
    return from.toLowerCase() !== ourEmail.toLowerCase();
  });
}
