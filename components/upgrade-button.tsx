"use client";

import { useState } from "react";

export function UpgradeButton() {
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setError(null);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else if (data.error) {
      setError(
        data.error.includes("not configured")
          ? "Billing not configured. Add Stripe keys to enable upgrades. See docs/SETUP_STRIPE.md"
          : (data.error as string)
      );
    }
  }

  return (
    <div>
      <button
        onClick={handleUpgrade}
        className="px-4 py-2 bg-black text-white rounded text-sm"
      >
        Upgrade to Pro (29/mo)
      </button>
      {error && (
        <p className="mt-2 text-red-600 text-sm max-w-md">{error}</p>
      )}
    </div>
  );
}
