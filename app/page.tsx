import Link from "next/link";

export default function HomePage() {
  const needsSetup =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
     !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">
        AI-powered outbound for recruitment agencies
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md text-center">
        Find leads, generate personalized outreach, and send campaigns
        automatically.
      </p>
      {needsSetup ? (
        <div className="mb-8 p-4 border border-amber-200 bg-amber-50 rounded-lg max-w-lg text-left">
          <p className="font-medium mb-2">Setup required</p>
          <p className="text-sm text-gray-700 mb-2">
            Add your Supabase credentials to <code className="bg-gray-200 px-1">.env.local</code> and restart the dev server:
          </p>
          <p className="text-sm text-gray-600">
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> or <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </p>
          <p className="text-sm mt-2">
            Run the migration in <code className="bg-gray-200 px-1">supabase/migrations/001_initial_schema.sql</code> in your Supabase project.
          </p>
        </div>
      ) : null}
      <Link
        href="/signup"
        className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
      >
        Get started
      </Link>
      <Link href="/login" className="mt-4 text-gray-500 hover:text-gray-700">
        Already have an account? Log in
      </Link>
    </main>
  );
}
