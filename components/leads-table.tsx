"use client";

import { useState } from "react";
import Link from "next/link";

type Lead = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string;
  website: string | null;
  status: string;
};

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) || "Search failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. recruitment agencies london"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border px-3 py-2 rounded"
        />
        <input
          type="number"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
          className="w-20 border px-2 py-2 rounded"
          min={1}
          max={100}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          {loading ? "Searching..." : "Find Leads"}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Company</th>
            <th className="text-left py-2">Contact</th>
            <th className="text-left py-2">Email</th>
            <th className="text-left py-2">Website</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b">
              <td className="py-2">{lead.company_name ?? "-"}</td>
              <td className="py-2">{lead.contact_name ?? "-"}</td>
              <td className="py-2">{lead.email}</td>
              <td className="py-2">
                {lead.website ? (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                    {lead.website}
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td className="py-2">{lead.status}</td>
              <td className="py-2">
                <Link
                  href={`/campaigns?lead=${lead.id}`}
                  className="text-blue-600 text-sm"
                >
                  Add to campaign
                </Link>
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">
                No leads yet. Search above to find leads.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
