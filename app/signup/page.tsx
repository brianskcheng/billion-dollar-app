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

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Sign up</h1>
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
