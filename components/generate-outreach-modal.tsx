"use client";

import { useState, useEffect } from "react";

export function GenerateOutreachModal({
  leadId,
  campaignId,
  leadEmail,
  onClose,
  onSent,
}: {
  leadId: string;
  campaignId: string;
  leadEmail: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [step, setStep] = useState<"generate" | "review" | "sending">("generate");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [messageId, setMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step === "generate") {
      setError(null);
      fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, campaignId, step: 1 }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
            return;
          }
          setSubject(data.subject ?? "");
          setBodyText(data.body_text ?? "");
          setMessageId(data.messageId ?? null);
          setStep("review");
        })
        .catch((e) => setError(e.message));
    }
  }, [leadId, campaignId, step]);

  async function handleSend() {
    if (!messageId) return;
    setStep("sending");
    setError(null);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, subject, body_text: bodyText }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      setStep("review");
      return;
    }
    onSent();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold">Outreach to {leadEmail}</h2>
          <button onClick={onClose} className="text-gray-500">
            Close
          </button>
        </div>
        {step === "generate" && (
          <p className="text-gray-600">Generating email...</p>
        )}
        {step === "review" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Body</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={8}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                className="px-4 py-2 bg-black text-white rounded"
              >
                Send
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {step === "sending" && (
          <p className="text-gray-600">Sending...</p>
        )}
      </div>
    </div>
  );
}
