"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      window.location.href = "/dashboard";
    } else {
      setError(
        "Signup OK but no session. Supabase Auth > Providers > Email: Confirm email must be OFF and saved."
      );
    }
  }

  async function handleOAuth(provider: "google" | "azure") {
    setError(null);
    const supabase = createClient();
    const origin = window.location.origin;
    const baseOptions = { redirectTo: `${origin}/auth/callback` };
    const options =
      provider === "google"
        ? {
            ...baseOptions,
            scopes: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
            queryParams: { access_type: "offline", prompt: "consent" },
          }
        : provider === "azure"
          ? {
              ...baseOptions,
              scopes: "Mail.Send Mail.Read User.Read email openid offline_access",
            }
          : baseOptions;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });
    if (error) setError(error.message);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Sign up</h1>
        <div className="space-y-3 mb-4">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="w-full py-2 border border-gray-300 rounded font-medium hover:bg-gray-50"
          >
            Sign in with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("azure")}
            className="w-full py-2 border border-gray-300 rounded font-medium hover:bg-gray-50"
          >
            Sign in with Microsoft
          </button>
        </div>
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              data-testid="signup-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              data-testid="signup-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            data-testid="signup-submit"
            className="w-full py-2 bg-black text-white rounded font-medium"
          >
            Sign up
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500">
          Already have an account? <Link href="/login" className="underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
