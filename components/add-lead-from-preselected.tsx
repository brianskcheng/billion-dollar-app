"use client";

import { useEffect } from "react";

export function AddLeadFromPreselected({
  campaignId,
  leadId,
  onReady,
}: {
  campaignId: string;
  leadId: string;
  onReady: (lead: { id: string; email: string }) => void;
}) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok || cancelled) return;
      const leadRes = await fetch("/api/leads/list");
      const leadData = await leadRes.json();
      const lead = (leadData.leads ?? []).find(
        (l: { id: string }) => l.id === leadId
      );
      if (lead && !cancelled) onReady(lead);
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, leadId, onReady]);

  return null;
}
