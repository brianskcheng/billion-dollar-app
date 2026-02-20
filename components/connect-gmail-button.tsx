"use client";

export function ConnectGmailButton({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span className="text-sm text-green-600">Gmail connected</span>
    );
  }
  return (
    <a
      href="/api/google/oauth/connect"
      className="px-4 py-2 bg-black text-white rounded text-sm font-medium hover:bg-gray-800"
    >
      Connect Gmail
    </a>
  );
}
