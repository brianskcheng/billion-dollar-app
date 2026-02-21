# Apify Lead Search Setup

To use "Find Leads" on the Leads page, add an Apify API token. The app uses the Google Maps scraper actor to search for businesses.

## Steps

1. Go to [apify.com](https://apify.com) and sign up
2. Go to **Settings > Integrations** (or Profile > API tokens)
3. Copy your **Personal API token**, or create one with "Create new token"

## Add to .env.local

```
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxxxxxxx
```

## Restart

Restart the dev server after adding the token.

## Testing

On the Leads page, enter a search like "recruitment agencies london" and click "Find Leads". Results will appear in the table. If no results have a website, you may see "No leads found" – try different keywords.

## Actor

The app uses `automationhub~google-maps-scraper`. Apify charges for usage; check your Apify plan and billing.

## Memory quota

If you see "actor-memory-limit-exceeded", your Apify account has hit its memory quota. Either upgrade at [billing/subscription](https://console.apify.com/billing/subscription) or wait for other runs to finish. The app requests 2048MB per run and caps results at 50 to reduce memory usage.
