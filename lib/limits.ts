import type { SupabaseClient } from "@supabase/supabase-js";

export const TRIAL_EMAIL_LIMIT = 20;
export const PRO_DAILY_LIMIT = 20;

export async function checkCanSend(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: boolean; reason?: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, trial_ends_at, monthly_email_limit")
    .eq("id", userId)
    .single();

  if (!profile) return { ok: false, reason: "Profile not found" };

  const plan = profile.plan as string;
  const trialEndsAt = profile.trial_ends_at as string | null;
  const monthlyLimit = (profile.monthly_email_limit as number) ?? TRIAL_EMAIL_LIMIT;

  if (plan === "trial" && trialEndsAt && new Date(trialEndsAt) < new Date()) {
    return { ok: false, reason: "Trial expired" };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "outbound")
    .in("status", ["sent", "delivered"])
    .gte("created_at", startOfMonth.toISOString());

  const sentThisMonth = count ?? 0;
  if (sentThisMonth >= monthlyLimit) {
    return { ok: false, reason: `Monthly limit (${monthlyLimit}) reached` };
  }

  return { ok: true };
}
