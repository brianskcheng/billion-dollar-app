import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_OFFER, DEFAULT_VALUE_PROP } from "@/lib/defaults";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAuth(supabase);
  if (auth.response) return auth.response;
  const user = auth.user;

  const body = await request.json();
  const name = body.name as string;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name: name.trim(),
      value_prop: DEFAULT_VALUE_PROP,
      offer: DEFAULT_OFFER,
      daily_send_limit: 10,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
