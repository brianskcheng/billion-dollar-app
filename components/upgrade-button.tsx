"use client";

export function UpgradeButton() {
  async function handleUpgrade() {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <button
      onClick={handleUpgrade}
      className="px-4 py-2 bg-black text-white rounded text-sm"
    >
      Upgrade to Pro (29/mo)
    </button>
  );
}
