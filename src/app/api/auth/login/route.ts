import { NextRequest, NextResponse } from "next/server";
import { collectionUrl, authHeader } from "@/lib/backend-config";
import { encryptPassword } from "@/lib/collection-crypto";
import { setSessionPayload } from "@/lib/session";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/rate-limit";
import type { SessionPayload } from "@/lib/types";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "Too many login attempts. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const username = body?.username?.toString().trim();
  const password = body?.password?.toString() ?? "";

  if (!username || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(collectionUrl("collection/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        Username: username,
        Pass: encryptPassword(password),
      }),
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to establish a connection with the server." },
      { status: 502 }
    );
  }

  if (res.status === 404) {
    return NextResponse.json({ message: "Incorrect Username/Password." }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ message: res.statusText || "Login failed." }, { status: res.status });
  }

  const data = await res.json().catch(() => null);
  if (!data) {
    return NextResponse.json({ message: "Unexpected response from server." }, { status: 502 });
  }

  const firstname = String(data.firstname ?? "");
  const lastname = String(data.lastname ?? "");

  const payload: SessionPayload = {
    userId: Number(data.user_id),
    username,
    pw: password,
    name: `${firstname.charAt(0)}. ${lastname}`,
    firstname,
    lastname,
    department: String(data.department ?? ""),
  };

  await setSessionPayload(payload);
  resetLoginRateLimit(ip);

  // Best-effort access history log, mirroring GlobalVariable.AccessHistory("Login").
  fetch(collectionUrl("collection/accesshistory"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      Name: payload.name,
      Action: "Login",
      Pc: "Web",
      IpAddress: req.headers.get("x-forwarded-for") || "unknown",
      Department: payload.department,
      Version: "web-1.0",
      App: "C-Monitoring",
    }),
  }).catch(() => {});

  const { pw, ...user } = payload;
  void pw;
  return NextResponse.json({ user });
}
