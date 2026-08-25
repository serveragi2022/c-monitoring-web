import { NextRequest, NextResponse } from "next/server";
import { collectionUrl, authHeader } from "@/lib/backend-config";
import { getSessionPayload } from "@/lib/session";
import { getCollectionTypeByRoute } from "@/lib/collection-config";
import type { CollectionTypeKey } from "@/lib/types";

function str(v: FormDataEntryValue | null): string | undefined {
  const s = v?.toString().trim();
  return s ? s : undefined;
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("heic")) return ".heic";
  return ".jpg";
}

function endpointFor(typeKey: CollectionTypeKey): string {
  if (typeKey === "cwt") return "collection/cwt";
  if (typeKey === "cm") return "collection/cm/mobile";
  if (typeKey === "others") return "collection/others/mobile";
  return "collection";
}

export async function POST(req: NextRequest) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const form = await req.formData();

  const confirmPassword = str(form.get("confirmPassword"));
  if (!confirmPassword || confirmPassword !== session.pw) {
    return NextResponse.json({ message: "Wrong password. Please try again." }, { status: 401 });
  }

  const typeKey = str(form.get("typeKey")) as CollectionTypeKey | undefined;
  const config = typeKey ? getCollectionTypeByRoute(typeKey) : undefined;
  if (!typeKey || !config) {
    return NextResponse.json({ message: "Unknown collection type." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const descriptionsRaw = str(form.get("descriptions"));
  let descriptions: string[] = [];
  try {
    descriptions = descriptionsRaw ? JSON.parse(descriptionsRaw) : [];
  } catch {
    descriptions = [];
  }

  if (files.length === 0) {
    return NextResponse.json({ message: "Attachment is required." }, { status: 400 });
  }

  const out = new FormData();

  if (typeKey === "cwt") {
    out.set("LocationRemit", str(form.get("location")) ?? "");
    out.set("DateCollected", str(form.get("dateCollected")) ?? "");
    const collectedFrom = str(form.get("collectedFrom"));
    if (collectedFrom) out.set("CollectedFrom", collectedFrom);
    const remarks = str(form.get("remarks"));
    if (remarks) out.set("Remarks", remarks);
    out.set("CreatedBy", session.name);
    out.set("UserId", String(session.userId));
    out.set("AmountCwt", str(form.get("amountCwt")) ?? "");
    out.set("WithCwt", "true");
    out.set("IsCwt", "true");
  } else if (typeKey === "cm") {
    out.set("PrincipalAccount", str(form.get("principalAccount")) ?? "");
    const remarks = str(form.get("remarks"));
    if (remarks) out.set("Remarks", remarks);
    out.set("CreatedBy", session.name);
    out.set("UserId", String(session.userId));
    out.set("CmTotalamount", str(form.get("cmTotalAmount")) ?? "");
    out.set("PaymentApplication", str(form.get("paymentApplication")) ?? "");
    out.set("WithItemReturn", str(form.get("withItemReturn")) === "true" ? "true" : "false");
  } else if (typeKey === "others") {
    out.set("PrincipalAccount", str(form.get("principalAccount")) ?? "");
    const remarks = str(form.get("remarks"));
    if (remarks) out.set("Remarks", remarks);
    out.set("CreatedBy", session.name);
    out.set("UserId", String(session.userId));
    out.set("OthersTotalamount", str(form.get("othersTotalAmount")) ?? "");
    out.set("PaymentApplication", str(form.get("paymentApplication")) ?? "");
  } else {
    // Standard payment-mode types (Cash, Check, Customer/Agent variants)
    const amount = str(form.get("amount"));
    if (amount) out.set("Amount", amount);

    const bank = str(form.get("bank"));
    if (bank) out.set("Bank", bank);

    const checkDate = str(form.get("checkDate"));
    if (checkDate) out.set("CheckDate", checkDate);

    const checkNo = str(form.get("checkNo"));
    if (checkNo) out.set("CheckNo", checkNo);

    const location = str(form.get("location"));
    if (location) out.set("LocationRemit", location);

    out.set("DateCollected", str(form.get("dateCollected")) ?? "");
    out.set("PaymentMode", config.paymentMode ?? "");

    const collectedFrom = str(form.get("collectedFrom"));
    if (collectedFrom) out.set("CollectedFrom", collectedFrom);

    const remarks = str(form.get("remarks"));
    if (remarks) out.set("Remarks", remarks);

    out.set("CreatedBy", session.name);
    out.set("UserId", String(session.userId));

    const withCwt = str(form.get("withCwt")) === "true";
    if (withCwt) {
      out.set("AmountCwt", str(form.get("amountCwt")) ?? "");
    }
    out.set("WithCwt", withCwt ? "true" : "false");

    const wvd = str(form.get("wvd")) === "true";
    out.set("Wvd", wvd ? "true" : "false");
    if (wvd) {
      const vdpp = str(form.get("vdpp")) === "true";
      out.set("Vdpp", vdpp ? "true" : "false");
      if (!vdpp) {
        out.set("OthersTotalamount", str(form.get("othersTotalAmount")) ?? "");
        out.set("OthersReason", str(form.get("othersReason")) ?? "");
      }
    }

    out.set("PaymentApplication", str(form.get("paymentApplication")) ?? "");
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const description = descriptions[i] || file.name;
    const safeName = description.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "attachment";
    out.append("files", file, `${safeName}${extFromMime(file.type)}`);
  }

  let res: Response;
  try {
    res = await fetch(collectionUrl(endpointFor(typeKey)), {
      method: "POST",
      headers: { Authorization: authHeader() },
      body: out,
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to establish a connection with the server." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { message: text || res.statusText || "Your transaction has failed. Please try again." },
      { status: res.status }
    );
  }

  const data = await res.json().catch(() => null);
  if (!data?.transRef) {
    return NextResponse.json({ message: "Unexpected response from server." }, { status: 502 });
  }

  return NextResponse.json({ transRef: data.transRef, dateCreated: data.dateCreated });
}
