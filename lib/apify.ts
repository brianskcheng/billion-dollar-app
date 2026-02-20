type ApifyResult = {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  category?: string;
};

export async function searchGoogleMaps(
  query: string,
  limit: number,
  token: string
): Promise<ApifyResult[]> {
  const parts = query.trim().split(/\s+/);
  const searchTerm = parts.length > 1 ? parts.slice(0, -1).join(" ") : query;
  const location = parts.length > 1 ? parts[parts.length - 1] : "UK";

  const res = await fetch(
    `https://api.apify.com/v2/acts/automationhub~google-maps-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchTerm,
        location,
        maxResults: Math.min(limit, 100),
        language: "en",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apify error: ${err}`);
  }

  const items = await res.json();
  return Array.isArray(items) ? items : [];
}
