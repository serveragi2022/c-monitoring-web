import { NextRequest, NextResponse } from "next/server";
import { orderingUrl, authHeader } from "@/lib/backend-config";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Not authenticated." }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";

  let res: Response;
  try {
    res = await fetch(orderingUrl("principalaccount/filter2"), {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[/api/principal-accounts] fetch to principalaccount/filter2 failed:", err);
    return NextResponse.json(
      { message: "Unable to reach the ordering API (principalaccount/filter2)." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[/api/principal-accounts] principalaccount/filter2 returned ${res.status}: ${text}`);
    return NextResponse.json(
      { message: `Unable to load principal accounts (status ${res.status}).` },
      { status: res.status }
    );
  }

  const raw: Array<{ principal_account?: string }> = await res.json().catch(() => []);
  let accounts = raw.map((r) => r.principal_account).filter((v): v is string => Boolean(v));

  // Empty `q` means "give me the full list" — the client uses this once to build its
  // allow-list for validation, so it must not be truncated the way a live search would be.
  if (q) {
    accounts = accounts.filter((a) => a.toLowerCase().includes(q)).slice(0, 30);
  }

  return NextResponse.json({ principalAccounts: accounts });
}
