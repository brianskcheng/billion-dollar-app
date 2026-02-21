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
  const [lastSearchZero, setLastSearchZero] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  async function handleAddManual() {
    const email = manualEmail.trim();
    if (!email) return;
    setManualLoading(true);
    setManualError(null);
    try {
      const res = await fetch("/api/leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          company_name: manualCompany.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setManualEmail("");
        setManualCompany("");
        setShowManualAdd(false);
        window.location.reload();
      } else {
        setManualError((data.error as string) || "Failed to add lead");
      }
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Failed to add lead");
    } finally {
      setManualLoading(false);
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setLastSearchZero(false);
    try {
      const res = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const count = (data.count as number) ?? 0;
        if (count > 0) {
          window.location.reload();
        } else {
          setLastSearchZero(true);
        }
      } else {
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
      {lastSearchZero && (
        <p className="text-amber-600 text-sm">
          Search completed. No leads found for this query. Try different keywords or location.
        </p>
      )}
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setShowManualAdd(!showManualAdd)}
          className="px-3 py-1.5 text-sm border rounded"
        >
          {showManualAdd ? "Cancel" : "Add lead manually"}
        </button>
        {showManualAdd && (
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="email"
              placeholder="Email (required)"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="border px-2 py-1 rounded text-sm w-48"
            />
            <input
              type="text"
              placeholder="Company name (optional)"
              value={manualCompany}
              onChange={(e) => setManualCompany(e.target.value)}
              className="border px-2 py-1 rounded text-sm w-40"
            />
            <button
              onClick={handleAddManual}
              disabled={manualLoading || !manualEmail.trim()}
              className="px-3 py-1.5 text-sm bg-gray-200 rounded disabled:opacity-50"
            >
              {manualLoading ? "Adding..." : "Add"}
            </button>
          </div>
        )}
      </div>
      {showManualAdd && manualError && (
        <p className="text-red-600 text-sm">{manualError}</p>
      )}
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
