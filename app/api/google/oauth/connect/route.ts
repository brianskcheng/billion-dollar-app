import { getAuthUrl } from "@/lib/gmail";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
