# Microsoft (Outlook) Setup (One OAuth App)

Use one Azure app for both "Sign in with Microsoft" and "Connect Outlook". Add the same credentials in two places: Supabase Dashboard and .env.

## Steps

1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App registrations
2. New registration: name the app, set Supported account types (Accounts in any org or personal Microsoft accounts)
3. Add redirect URIs (Web): both
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (from Supabase Dashboard > Settings > API)
   - `http://localhost:3000/api/microsoft/oauth/callback` (and production URL when deploying)
4. API Permissions > Add permission > Microsoft Graph > Delegated: `Mail.Send`, `Mail.Read`, `User.Read`
5. Certificates & secrets > New client secret > copy the value
6. Overview: copy Application (client) ID

## Add to Supabase Dashboard

1. Supabase Dashboard > Authentication > Providers > Azure
2. Enable Azure (Microsoft)
3. Paste the **same** Client ID and Client secret

## Add to .env.local

Use the **same** Client ID and Secret:

```
MICROSOFT_CLIENT_ID=your_application_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/microsoft/oauth/callback
```

(or leave `MICROSOFT_REDIRECT_URI` empty to use `NEXT_PUBLIC_SITE_URL/api/microsoft/oauth/callback`)

## Restart

Restart the dev server after adding the keys.

## Result

- **Sign in with Microsoft**: One consent grants auth and Outlook access (send/read)
- **Connect Outlook**: Same OAuth flow for email/password users; uses same app

## Testing

Sign in with Microsoft on the login page, or click "Connect Outlook" on the dashboard. After approving, you'll have email access.
