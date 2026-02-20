import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LeadsTable } from "@/components/leads-table";
import { ConnectGmailButton } from "@/components/connect-gmail-button";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gmail } = await supabase
    .from("integrations_google")
    .select("email")
    .eq("user_id", user.id)
    .single();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8">
      <nav className="flex gap-4 mb-8 items-center">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/leads" className="font-medium">Leads</Link>
        <Link href="/campaigns">Campaigns</Link>
        <Link href="/inbox">Inbox</Link>
        <div className="ml-auto flex items-center gap-4">
          <ConnectGmailButton connected={!!gmail} />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-gray-500 hover:text-black">
              Log out
            </button>
          </form>
        </div>
      </nav>
      <h1 className="text-2xl font-bold mb-4">Leads</h1>
      <LeadsTable leads={leads ?? []} />
    </main>
  );
}
