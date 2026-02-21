import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CampaignsList } from "@/components/campaigns-list";
import { ConnectEmailButton } from "@/components/connect-email-button";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin =
    (profile?.role as string) === "admin" ||
    (process.env.ADMIN_EMAIL &&
      user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());

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

  const { data: microsoft } = await supabase
    .from("integrations_microsoft")
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
        {isAdmin && <Link href="/admin">Admin</Link>}
        <div className="ml-auto flex items-center gap-4">
          <ConnectEmailButton
            gmailConnected={!!gmail}
            microsoftConnected={!!microsoft}
          />
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
        emailConnected={!!gmail || !!microsoft}
      />
    </main>
  );
}
