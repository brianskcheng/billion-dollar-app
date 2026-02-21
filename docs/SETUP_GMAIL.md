# Gmail Setup (One OAuth App)

Use one Google OAuth client for both "Sign in with Google" and "Connect Gmail". Add the same credentials in two places: Supabase Dashboard and .env.

## Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project or select one
3. Enable **Gmail API**: APIs & Services > Library > search "Gmail API" > Enable
4. Create OAuth credentials: APIs & Services > Credentials > Create Credentials > OAuth client ID
5. Application type: **Web application**
6. Authorized redirect URIs: add both
   - `https://<your-project-ref>.supabase.co/auth/v1/callback` (from Supabase Dashboard > Settings > API)
   - `http://localhost:3000/api/google/oauth/callback` (and your production URL when deploying)
7. Copy **Client ID** and **Client secret**

## Add to Supabase Dashboard

1. Supabase Dashboard > Authentication > Providers > Google
2. Enable Google
3. Paste the **same** Client ID and Client secret

## Add to .env.local

Use the **same** Client ID and Secret:

```
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback
```

(or leave `GOOGLE_REDIRECT_URI` empty to use `NEXT_PUBLIC_SITE_URL/api/google/oauth/callback`)

## Restart

Restart the dev server after adding the keys.

## Result

- **Sign in with Google**: One consent grants auth and Gmail access (send/read)
- **Connect Gmail**: Same OAuth flow for email/password users; uses same app

## Testing

Sign in with Google on the login page, or click "Connect Gmail" on the dashboard. After approving, you'll have email access.
