import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { collectionUrl, orderingUrl, authHeader } from "@/lib/backend-config";
import { getSessionPayload } from "@/lib/session";
import { getCollectionTypeByRoute } from "@/lib/collection-config";
import type { CollectionTypeKey } from "@/lib/types";
import { convertImageToPdf } from "@/lib/image-to-pdf";
import { uploadAttachmentToGCS } from "@/lib/gcs";

function str(v: FormDataEntryValue | null): string | undefined {
  const s = v?.toString().trim();
  return s ? s : undefined;
}

// Mirrors the backend's own convention (see the C# side):
//   Guid newGuid = Guid.NewGuid();
//   string guidString = newGuid.ToString() + DateTime.Now.ToString("MM-dd-yyyy-HH-mm");
// randomUUID() already matches .NET's default Guid.ToString() format (lowercase,
// hyphenated), so we just need to append the same date suffix, un-separated.
//
// IMPORTANT: `DateTime.Now` on your backend is presumably Philippine time (server's local
// clock). Vercel's serverless functions run in UTC regardless of region, so we can't just
// use the Node server's local time here — it has to be explicitly formatted in Asia/Manila
// to match, no matter where Vercel actually executes the function.
const PH_TIME_ZONE = "Asia/Manila";

function buildAttachmentGuid(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // hour12: false can render midnight as "24" in some ICU builds — normalize to "00".
  const hour = get("hour") === "24" ? "00" : get("hour");

  const dateSuffix = `${get("month")}-${get("day")}-${get("year")}-${hour}-${get("minute")}`;
  return randomUUID() + dateSuffix;
}

// Fetches the authoritative bank list from the backend and confirms `bank` is one of
// them (case-insensitive). Never trust the client's dropdown alone — the same check the
// UI does client-side is repeated here so nothing gets encoded with an off-list bank.
async function isKnownBank(bank: string): Promise<boolean> {
  try {
    const res = await fetch(collectionUrl("collection/banklist"), {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const raw: Array<{ bank?: string; Bank?: string }> = await res.json().catch(() => []);
    const names = raw.map((b) => (b.bank ?? b.Bank ?? "").trim().toLowerCase()).filter(Boolean);
    return names.includes(bank.trim().toLowerCase());
  } catch {
    return false;
  }
}

// Same idea for principal accounts (ordering API), used by the CM / Others collection types.
async function isKnownPrincipalAccount(principalAccount: string): Promise<boolean> {
  try {
    const res = await fetch(orderingUrl("principalaccount/filter2"), {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const raw: Array<{ principal_account?: string }> = await res.json().catch(() => []);
    const names = raw.map((r) => (r.principal_account ?? "").trim().toLowerCase()).filter(Boolean);
    return names.includes(principalAccount.trim().toLowerCase());
  } catch {
    return false;
  }
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

  // Bank must be one of the bank list options — never allow an off-list value to be encoded,
  // regardless of what the client sent.
  const bankValue = str(form.get("bank"));
  if (bankValue) {
    const ok = await isKnownBank(bankValue);
    if (!ok) {
      return NextResponse.json(
        { message: `"${bankValue}" is not a recognized bank. Please pick one from the list.` },
        { status: 400 }
      );
    }
  }

  // Same restriction for Principal Account (CM / Others types).
  const principalAccountValue = str(form.get("principalAccount"));
  if (principalAccountValue) {
    const ok = await isKnownPrincipalAccount(principalAccountValue);
    if (!ok) {
      return NextResponse.json(
        {
          message: `"${principalAccountValue}" is not a recognized principal account. Please pick one from the list.`,
        },
        { status: 400 }
      );
    }
  }

  // Convert every picture attachment to a single-page PDF, then upload all of them into a
  // single per-submission GCS folder (named after a fresh GUID) instead of forwarding the
  // raw bytes through this API to the backend. The backend only receives that folder's GUID
  // (see AttachmentGuid below) and is expected to know how to look the folder up in the bucket.
  const attachmentGuid = buildAttachmentGuid();
  try {
    await Promise.all(
      files.map(async (file, i) => {
        const description = descriptions[i] || file.name;
        const inputBuffer = Buffer.from(await file.arrayBuffer());
        const pdfBuffer = await convertImageToPdf(inputBuffer);
        // Encode the name BEFORE attaching/uploading: strip to a safe slug, then prefix
        // with this file's index within the submission. The index makes every filename
        // unique even when two attachments share the exact same description (e.g. two
        // photos both left as "attachment" or both typed the same) — without it, the
        // second upload silently overwrote the first at the same GCS path.
        const slug = description.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "attachment";
        const safeName = `${i + 1}-${slug}`;
        await uploadAttachmentToGCS(pdfBuffer, `${safeName}.pdf`, "application/pdf", attachmentGuid);
      })
    );
  } catch (err) {
    console.error("[/api/collections] attachment conversion/upload failed:", err);
    return NextResponse.json(
      { message: "Unable to process one or more attachments. Please try again." },
      { status: 502 }
    );
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

  // NOTE: field name assumption — the backend previously received raw multipart `files`.
  // It now receives just the GCS folder GUID that holds the converted PDFs for this
  // submission. Adjust the field name here if the backend expects a different key.
  out.set("AttachmentGuid", attachmentGuid);

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
