import { createClient } from "@/lib/supabase/server";
import { searchGoogleMaps } from "@/lib/apify";
import { parseBody, leadsSearchSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Lead search requires APIFY_API_TOKEN. Add it to your .env file and restart the server. Get a token at https://console.apify.com/account/integrations",
      },
      { status: 500 }
    );
  }

  const parsed = await parseBody(leadsSearchSchema, request);
  if (parsed.error) return parsed.error;
  const { query, limit: limitRaw } = parsed.data;
  const limit = limitRaw ?? 50;

  try {
    const items = await searchGoogleMaps(query, limit, token);
    const leads = items
      .filter((item) => item.website || item.phone || item.name)
      .map((item) => {
        const domain = item.website
          ? new URL(
              item.website.startsWith("http") ? item.website : `https://${item.website}`
            ).hostname.replace(/^www\./, "")
          : null;
        const email = domain ? `hello@${domain}` : null;
        return {
          user_id: user.id,
          source: "apify",
          company_name: item.name ?? null,
          contact_name: null,
          email: email ?? "",
          website: item.website ?? null,
          location: item.address ?? null,
          industry: item.category ?? null,
          notes: item.phone ? `Phone: ${item.phone}` : null,
          status: "new",
        };
      })
      .filter((l) => l.email);

    if (leads.length > 0) {
      const { error } = await supabase.from("leads").insert(leads);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ count: leads.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
