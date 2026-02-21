import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ConnectEmailButton } from "@/components/connect-email-button";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin =
    (profile?.role as string) === "admin" ||
    (process.env.ADMIN_EMAIL &&
      user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());

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

  const { data: events } = await supabase
    .from("events_email")
    .select("id, message_id")
    .eq("user_id", user.id)
    .eq("type", "reply_detected")
    .order("created_at", { ascending: false })
    .limit(50);

  const replyList: {
    id: string;
    messageId: string;
    leadId: string;
    subject: string;
    leadEmail: string;
    leadCompany: string | null;
  }[] = [];

  if (events?.length) {
    const msgIds = events.map((e) => e.message_id).filter(Boolean);
    const { data: messages } = await supabase
      .from("messages")
      .select("id, lead_id, subject")
      .in("id", msgIds);

    const leadIds = Array.from(new Set((messages ?? []).map((m) => m.lead_id).filter(Boolean)));
    const { data: leads } = await supabase
      .from("leads")
      .select("id, email, company_name")
      .in("id", leadIds);

    const leadsMap = new Map((leads ?? []).map((l) => [l.id, l]));
    const messagesMap = new Map((messages ?? []).map((m) => [m.id, m]));

    for (const e of events) {
      const m = messagesMap.get(e.message_id);
      const l = m ? leadsMap.get(m.lead_id) : null;
      replyList.push({
        id: e.id,
        messageId: e.message_id,
        leadId: m?.lead_id ?? "",
        subject: (m?.subject as string) ?? "",
        leadEmail: l?.email ?? "",
        leadCompany: l?.company_name ?? null,
      });
    }
  }

  return (
    <main className="min-h-screen p-8">
      <nav className="flex gap-4 mb-8 items-center">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/leads">Leads</Link>
        <Link href="/campaigns">Campaigns</Link>
        <Link href="/inbox" className="font-medium">Inbox</Link>
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
      <h1 className="text-2xl font-bold mb-4">Replies</h1>
      <p className="text-gray-600 mb-4">
        Leads who replied to your outreach (detected automatically).
      </p>
      <div className="border rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left py-2 px-3">Lead</th>
              <th className="text-left py-2 px-3">Subject</th>
            </tr>
          </thead>
          <tbody>
            {replyList.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 px-3">
                  {r.leadCompany ?? r.leadEmail}
                  <br />
                  <span className="text-sm text-gray-500">{r.leadEmail}</span>
                </td>
                <td className="py-2 px-3">{r.subject}</td>
              </tr>
            ))}
            {replyList.length === 0 && (
              <tr>
                <td colSpan={2} className="py-8 text-center text-gray-500">
                  No replies yet. Sent emails will appear here when leads reply.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
