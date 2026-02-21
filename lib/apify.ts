type ApifyResult = {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  category?: string;
};

/** Lower memory (2048MB) to fit free-tier quota; actor default is 4096MB. */
const APIFY_MEMORY_MB = 2048;

export async function searchGoogleMaps(
  query: string,
  limit: number,
  token: string
): Promise<ApifyResult[]> {
  const parts = query.trim().split(/\s+/);
  const searchTerm = parts.length > 1 ? parts.slice(0, -1).join(" ") : query;
  const location = parts.length > 1 ? parts[parts.length - 1] : "UK";

  const params = new URLSearchParams({
    token,
    memory: String(APIFY_MEMORY_MB),
  });
  const url = `https://api.apify.com/v2/acts/automationhub~google-maps-scraper/run-sync-get-dataset-items?${params.toString()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      searchTerm,
      location,
      maxResults: Math.min(limit, 50),
      language: "en",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes("actor-memory-limit-exceeded")) {
      throw new Error(
        `Apify memory quota reached. Upgrade at https://console.apify.com/billing/subscription or wait for other runs to finish.`
      );
    }
    throw new Error(`Apify error: ${err}`);
  }

  const items = await res.json();
  return Array.isArray(items) ? items : [];
}
