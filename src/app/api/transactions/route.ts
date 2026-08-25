import { NextRequest, NextResponse } from "next/server";
import { collectionUrl, authHeader } from "@/lib/backend-config";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Not authenticated." }, { status: 401 });

  const take = req.nextUrl.searchParams.get("take") ?? "20";

  const res = await fetch(
    collectionUrl(`collection/history?userid=${session.userId}&take=${encodeURIComponent(take)}`),
    {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return NextResponse.json({ message: "Unable to load transactions." }, { status: res.status });
  }

  const raw: Array<{ transid: number; transref: string; dateip: string }> = await res
    .json()
    .catch(() => []);

  const transactions = raw.map((t) => ({
    transId: t.transid,
    transRef: t.transref,
    dateCreated: t.dateip,
  }));

  return NextResponse.json({ transactions });
}
