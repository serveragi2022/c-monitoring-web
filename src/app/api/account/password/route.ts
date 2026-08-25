import { NextRequest, NextResponse } from "next/server";
import { collectionUrl, authHeader } from "@/lib/backend-config";
import { encryptPassword } from "@/lib/collection-crypto";
import { getSessionPayload, setSessionPayload } from "@/lib/session";

export async function PUT(req: NextRequest) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword?.toString() ?? "";
  const newUsername = body?.newUsername?.toString().trim();
  const newPassword = body?.newPassword?.toString() ?? "";
  const confirmPassword = body?.confirmPassword?.toString() ?? "";

  if (!newUsername || !newPassword || !confirmPassword || !currentPassword) {
    return NextResponse.json({ message: "Incomplete Information." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ message: "Confirm Password not match" }, { status: 400 });
  }
  // Same local check the app performs against the in-memory password (no server round trip).
  if (currentPassword !== session.pw) {
    return NextResponse.json({ message: "Current Password not match" }, { status: 400 });
  }

  const res = await fetch(collectionUrl("collection/user/changeusernamepassword"), {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      UserId: session.userId,
      Username: newUsername,
      Pass: encryptPassword(newPassword),
      ModifiedBy: session.name,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Unable to save changes." }, { status: res.status });
  }

  const updated = { ...session, username: newUsername, pw: newPassword };
  await setSessionPayload(updated);

  const { pw, ...user } = updated;
  void pw;
  return NextResponse.json({ user });
}
