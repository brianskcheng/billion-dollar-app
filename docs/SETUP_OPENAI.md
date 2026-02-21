# OpenAI Setup

To use "Generate + Send" (AI-generated outreach emails), add an OpenAI API key.

## Steps

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API keys** (or Settings > API keys)
4. Create a new secret key

## Add to .env.local

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx
```

## Restart

Restart the dev server after adding the key.

## Testing

Create a campaign, add a lead, then click "Generate + Send". The modal will call OpenAI to generate a personalized subject and body. If you see "OPENAI_API_KEY not configured", the key is missing or invalid.
