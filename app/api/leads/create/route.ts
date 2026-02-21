import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const email = (body.email as string)?.trim();
  const companyName = (body.company_name as string)?.trim() || null;

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      user_id: user.id,
      source: "manual",
      email,
      company_name: companyName,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: lead.id, ok: true });
}
