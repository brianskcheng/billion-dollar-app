import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ConnectGmailButton } from "@/components/connect-gmail-button";
import { UpgradeButton } from "@/components/upgrade-button";
import { GmailFeedbackBanner } from "@/components/gmail-feedback-banner";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail_connected?: string; gmail_error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const { data: gmail } = await supabase
    .from("integrations_google")
    .select("email")
    .eq("user_id", user.id)
    .single();

  return (
    <main className="min-h-screen p-8">
      <nav className="flex gap-4 mb-8 items-center">
        <Link href="/dashboard" className="font-medium">Dashboard</Link>
        <Link href="/leads">Leads</Link>
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
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <GmailFeedbackBanner
        gmailConnected={params.gmail_connected}
        gmailError={params.gmail_error}
      />
      {profile?.plan !== "pro" && (
        <div className="mb-4">
          <UpgradeButton />
        </div>
      )}
      <p className="text-gray-600">
        Welcome. Go to <Link href="/leads" className="underline">Leads</Link> to find
        leads, or <Link href="/campaigns" className="underline">Campaigns</Link> to run
        outreach.
      </p>
    </main>
  );
}
