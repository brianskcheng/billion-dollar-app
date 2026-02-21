import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type RequireAuthResult =
  | { user: User; response?: never }
  | { user?: never; response: NextResponse };

/**
 * Require authentication for API routes. Call with the Supabase client, then:
 *   const auth = await requireAuth(supabase);
 *   if (auth.response) return auth.response;
 *   const user = auth.user;
 */
export async function requireAuth(supabase: SupabaseClient): Promise<RequireAuthResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}
