"use client";

export function EmailFeedbackBanner({
  gmailConnected,
  gmailError,
  emailConnected,
  emailError,
  authError,
}: {
  gmailConnected?: string;
  gmailError?: string;
  emailConnected?: string;
  emailError?: string;
  authError?: string;
}) {
  if (gmailConnected || emailConnected) {
    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
        Email connected successfully.
      </div>
    );
  }
  const error = gmailError ?? emailError ?? authError;
  if (error) {
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
        {decodeURIComponent(error)}
      </div>
    );
  }
  return null;
}
