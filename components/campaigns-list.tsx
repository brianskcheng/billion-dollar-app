"use client";

import { useState } from "react";
import { GenerateOutreachModal } from "./generate-outreach-modal";
import { AddLeadFromPreselected } from "./add-lead-from-preselected";

type Campaign = {
  id: string;
  name: string;
  status: string;
  value_prop: string | null;
  offer: string | null;
};

export function CampaignsList({
  campaigns,
  preselectedLeadId,
  emailConnected,
}: {
  campaigns: Campaign[];
  preselectedLeadId?: string;
  emailConnected: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<{
    leadId: string;
    campaignId: string;
    leadEmail: string;
  } | null>(null);

  async function handleCreateCampaign() {
    if (!newName.trim()) return;
    setCreateError(null);
    const res = await fetch("/api/campaigns/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      setShowCreate(false);
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setCreateError((data.error as string) || "Failed to create campaign");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-black text-white rounded"
        >
          New campaign
        </button>
        {!emailConnected && (
          <span className="text-sm text-amber-600">
            Connect email to send messages
          </span>
        )}
      </div>

      {showCreate && (
        <div className="border p-4 rounded flex gap-2 flex-wrap">
          {createError && <p className="text-red-600 text-sm w-full">{createError}</p>}
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Campaign name"
            className="flex-1 border px-3 py-2 rounded"
            onKeyDown={(e) => e.key === "Enter" && handleCreateCampaign()}
          />
          <button
            onClick={handleCreateCampaign}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Create
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewName(""); }}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map((campaign, i) => (
          <CampaignRow
            key={campaign.id}
            campaign={campaign}
            preselectedLeadId={i === 0 ? preselectedLeadId : undefined}
            onGenerate={(leadId, leadEmail) =>
              setGeneratingFor({ leadId, campaignId: campaign.id, leadEmail })
            }
            onPreselectedReady={(lead) =>
              setGeneratingFor({
                leadId: lead.id,
                campaignId: campaign.id,
                leadEmail: lead.email,
              })
            }
          />
        ))}
        {campaigns.length === 0 && (
          <p className="text-gray-500">No campaigns yet. Create one above.</p>
        )}
      </div>

      {generatingFor && (
        <GenerateOutreachModal
          leadId={generatingFor.leadId}
          campaignId={generatingFor.campaignId}
          leadEmail={generatingFor.leadEmail}
          onClose={() => setGeneratingFor(null)}
          onSent={() => {
            setGeneratingFor(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function CampaignRow({
  campaign,
  preselectedLeadId,
  onGenerate,
  onPreselectedReady,
}: {
  campaign: Campaign;
  preselectedLeadId?: string;
  onGenerate: (leadId: string, leadEmail: string) => void;
  onPreselectedReady: (lead: { id: string; email: string }) => void;
}) {
  const [addingLead, setAddingLead] = useState(preselectedLeadId ?? "");
  const [campaignLeads, setCampaignLeads] = useState<
    { id: string; email: string; company_name: string | null }[]
  >([]);
  const [pickerLeads, setPickerLeads] = useState<
    { id: string; email: string; company_name: string | null }[]
  >([]);
  const [showPicker, setShowPicker] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [addLeadError, setAddLeadError] = useState<string | null>(null);

  async function loadCampaignLeads() {
    if (loaded) return;
    const res = await fetch(`/api/campaigns/${campaign.id}/leads`);
    if (res.ok) {
      const data = await res.json();
      setCampaignLeads(data.leads ?? []);
      setLoaded(true);
    }
  }

  async function handleAddLead() {
    if (!addingLead.trim()) return;
    setAddLeadError(null);
    const res = await fetch(`/api/campaigns/${campaign.id}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: addingLead.trim() }),
    });
    if (res.ok) {
      setAddingLead("");
      setLoaded(false);
      loadCampaignLeads();
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = typeof data?.error === "string" ? data.error : (typeof data?.message === "string" ? data.message : "Failed to add lead");
      setAddLeadError(msg);
    }
  }

  async function handleShowPicker() {
    const res = await fetch("/api/leads/list");
    if (!res.ok) return;
    const data = await res.json();
    const allLeads = data.leads ?? [];
    if (allLeads.length === 0) {
      alert("No leads. Search for leads first on the Leads page.");
      return;
    }
    setPickerLeads(allLeads);
    setShowPicker(true);
  }

  async function handleAddFromPicker(leadId: string) {
    setAddLeadError(null);
    const res = await fetch(`/api/campaigns/${campaign.id}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });
    if (res.ok) {
      setShowPicker(false);
      setLoaded(false);
      loadCampaignLeads();
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = typeof data?.error === "string" ? data.error : (typeof data?.message === "string" ? data.message : "Failed to add lead");
      setAddLeadError(msg);
    }
  }

  return (
    <div
      className="border p-4 rounded"
      onFocus={() => loadCampaignLeads()}
      onMouseEnter={() => loadCampaignLeads()}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium">{campaign.name}</h3>
          <span className="text-sm text-gray-500">{campaign.status} </span>
          {campaign.status === "draft" && (
            <>
              <button
                onClick={async () => {
                  setStartError(null);
                  const res = await fetch(`/api/campaigns/${campaign.id}/start`, {
                    method: "POST",
                  });
                  if (res.ok) {
                    window.location.reload();
                  } else {
                    const data = await res.json().catch(() => ({}));
                    const msg = typeof data?.error === "string" ? data.error : (typeof data?.message === "string" ? data.message : "Failed to start");
                    setStartError(msg);
                  }
                }}
                className="ml-2 text-sm text-blue-600"
              >
                Start
              </button>
              {startError && (
                <span className="ml-2 text-sm text-red-600">{startError}</span>
              )}
            </>
          )}
        </div>
      </div>
      {addLeadError && (
        <p className="text-red-600 text-sm mb-2">{addLeadError}</p>
      )}
      <div className="mt-2 flex gap-2 flex-wrap">
        <input
          value={addingLead}
          onChange={(e) => setAddingLead(e.target.value)}
          placeholder="Lead ID to add"
          className="border px-2 py-1 rounded text-sm w-48"
        />
        <button
          onClick={handleAddLead}
          className="px-2 py-1 bg-gray-200 rounded text-sm"
        >
          Add
        </button>
        <button
          onClick={handleShowPicker}
          className="px-2 py-1 border rounded text-sm"
        >
          Pick from leads
        </button>
      </div>
      {showPicker && (
        <div className="mt-2 p-2 border rounded bg-gray-50 max-h-40 overflow-auto">
          <p className="text-sm font-medium mb-1">Select a lead to add:</p>
          {pickerLeads.map((l) => (
            <div
              key={l.id}
              className="flex justify-between items-center text-sm py-1"
            >
              <span>{l.company_name ?? l.email}</span>
              <button
                onClick={() => handleAddFromPicker(l.id)}
                className="text-blue-600"
              >
                Add
              </button>
            </div>
          ))}
          <button
            onClick={() => setShowPicker(false)}
            className="text-sm text-gray-500 mt-1"
          >
            Close
          </button>
        </div>
      )}
      {campaignLeads.length > 0 && !showPicker && (
        <ul className="mt-2 space-y-1">
          {campaignLeads.map((l) => (
            <li key={l.id} className="flex justify-between items-center text-sm">
              <span>{l.company_name ?? l.email}</span>
              <button
                onClick={() => onGenerate(l.id, l.email)}
                className="text-blue-600"
              >
                Generate + Send
              </button>
            </li>
          ))}
        </ul>
      )}
      {preselectedLeadId && (
        <AddLeadFromPreselected
          campaignId={campaign.id}
          leadId={preselectedLeadId}
          onReady={(lead) => onPreselectedReady(lead)}
        />
      )}
    </div>
  );
}
