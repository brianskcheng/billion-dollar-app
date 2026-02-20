import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CampaignsList } from "@/components/campaigns-list";
import { ConnectGmailButton } from "@/components/connect-gmail-button";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const preselectedLeadId = params.lead;

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: gmail } = await supabase
    .from("integrations_google")
    .select("email")
    .eq("user_id", user.id)
    .single();

  return (
    <main className="min-h-screen p-8">
      <nav className="flex gap-4 mb-8 items-center">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/leads">Leads</Link>
        <Link href="/campaigns" className="font-medium">Campaigns</Link>
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
      <h1 className="text-2xl font-bold mb-4">Campaigns</h1>
      <CampaignsList
        campaigns={campaigns ?? []}
        preselectedLeadId={preselectedLeadId}
        gmailConnected={!!gmail}
      />
    </main>
  );
}
