import { createClient } from "@/lib/supabase/server";
import { searchGoogleMaps } from "@/lib/apify";
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
      { error: "APIFY_API_TOKEN not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const query = body.query as string;
  const limit = Math.min(Math.max(parseInt(body.limit) || 50, 1), 100);

  if (!query?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

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
