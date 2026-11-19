import { NextResponse } from "next/server";
import { readOffice, type OfficeClient } from "@/lib/officeRead";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** What the 3D office shows. Only for the signed in owner: every read goes through the owner only database rules. */
export async function GET() {
  const supabase = await serverClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "not signed in" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const office = await readOffice(supabase as unknown as OfficeClient, new Date());
    return NextResponse.json(office, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "could not read your data" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
