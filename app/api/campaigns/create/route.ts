import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      value_prop:
        "We place pre-vetted candidates fast (7-10 days) without wasting your time.",
      offer: "15-min call + we'll share 3 candidate profiles relevant to you.",
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
