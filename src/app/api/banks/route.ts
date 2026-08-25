import { NextResponse } from "next/server";
import { collectionUrl, authHeader } from "@/lib/backend-config";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Not authenticated." }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(collectionUrl("collection/banklist"), {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[/api/banks] fetch to collection/banklist failed:", err);
    return NextResponse.json(
      { message: "Unable to reach the collection API (collection/banklist)." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[/api/banks] collection/banklist returned ${res.status}: ${text}`);
    return NextResponse.json(
      { message: `Unable to load banks (status ${res.status}).` },
      { status: res.status }
    );
  }

  const raw: Array<{ bank?: string; Bank?: string }> = await res.json().catch(() => []);
  const banks = raw.map((b, i) => ({ bankId: i, bank: b.bank ?? b.Bank ?? "" })).filter((b) => b.bank);

  return NextResponse.json({ banks });
}
