import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ConnectEmailButton } from "@/components/connect-email-button";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdminByRole = (profile?.role as string) === "admin";
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const isAdminByEmail =
    !!adminEmail &&
    user.email?.toLowerCase() === adminEmail.toLowerCase();
  const isAdmin = isAdminByRole || !!isAdminByEmail;

  if (!isAdmin) redirect("/dashboard");

  const service = await createServiceClient();
  const { count: userCount } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true });

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
        <Link href="/campaigns">Campaigns</Link>
        <Link href="/inbox">Inbox</Link>
        <Link href="/admin" className="font-medium">
          Admin
        </Link>
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
      <h1 className="text-2xl font-bold mb-4">Admin</h1>
      <p className="text-gray-600 mb-4">
        Admin area. {userCount ?? 0} user(s) registered.
      </p>
    </main>
  );
}
