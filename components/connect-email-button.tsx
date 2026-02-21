"use client";

export function ConnectEmailButton({
  gmailConnected,
  microsoftConnected,
}: {
  gmailConnected: boolean;
  microsoftConnected: boolean;
}) {
  const connected = gmailConnected || microsoftConnected;

  if (connected) {
    return (
      <span className="text-sm text-green-600">Email connected</span>
    );
  }

  return (
    <div className="flex gap-2">
      <a
        href="/api/google/oauth/connect"
        className="px-4 py-2 bg-black text-white rounded text-sm font-medium hover:bg-gray-800"
      >
        Connect Gmail
      </a>
      <a
        href="/api/microsoft/oauth/connect"
        className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50"
      >
        Connect Outlook
      </a>
    </div>
  );
}
