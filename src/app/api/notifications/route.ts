import { NextRequest, NextResponse } from "next/server";
import { collectionUrl, authHeader } from "@/lib/backend-config";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Not authenticated." }, { status: 401 });

  const res = await fetch(collectionUrl(`collection/notif?userid=${session.userId}`), {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Unable to load notifications." }, { status: res.status });
  }

  const raw: Array<{ transid: number; transref: string; dateip: string }> = await res
    .json()
    .catch(() => []);

  const notifications = raw.map((n) => ({
    transId: n.transid,
    transRef: n.transref,
    dateCreated: n.dateip,
  }));

  return NextResponse.json({ notifications });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ message: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const transIds: number[] = Array.isArray(body?.transIds) ? body.transIds : [];

  // Mirrors notif.xaml.cs OnDisappearing: PUT collection/notif with a Collection
  // whose CTemp field holds a JSON-serialized list of { TransId } objects.
  const res = await fetch(collectionUrl("collection/notif"), {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      CTemp: JSON.stringify(transIds.map((id) => ({ TransId: id }))),
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Unable to update notifications." }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
