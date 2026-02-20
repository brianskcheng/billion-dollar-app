"use client";

export function GmailFeedbackBanner({
  gmailConnected,
  gmailError,
}: {
  gmailConnected?: string;
  gmailError?: string;
}) {
  if (gmailConnected) {
    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
        Gmail connected successfully.
      </div>
    );
  }
  if (gmailError) {
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
        Gmail error: {decodeURIComponent(gmailError)}
      </div>
    );
  }
  return null;
}
