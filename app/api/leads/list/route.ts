import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id, email, company_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ leads: leads ?? [] });
}
