import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function keyFormat(key: string): string {
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("eyJ")) return "legacy_jwt";
  return "unknown";
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase URL or client key not configured",
        debug: {
          urlSet: !!url,
          keySet: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
      },
      { status: 500 }
    );
  }

  const debug = {
    urlHost: url.replace(/^https?:\/\//, "").split("/")[0],
    keyFormat: keyFormat(key),
    keyLen: key.length,
    hint: key.length < 40 ? "Key may be truncated - re-copy from Supabase Dashboard" : null,
  };

  try {
    const supabase = createClient(url, key);
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) {
      const msg = error.message ?? String(error);
      const isUnreachable = /fetch|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|socket|connection/i.test(msg);
      return NextResponse.json(
        isUnreachable
          ? { ok: true, supabase: "unreachable", note: msg, debug }
          : { ok: false, error: msg, debug },
        { status: isUnreachable ? 200 : 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      supabase: "connected",
      keyFormat: debug.keyFormat,
    });
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err ?? "Unknown error");
    return NextResponse.json(
      { ok: true, supabase: "unreachable", note: msg, debug },
      { status: 200 }
    );
  }
}
