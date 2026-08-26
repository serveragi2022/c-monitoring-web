"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, RotateCcw, X } from "lucide-react";
import type { CollectionTypeConfig } from "@/lib/collection-config";
import { LOCATIONS, getCollectionTypeByRoute } from "@/lib/collection-config";
import { api } from "@/lib/api-client";
import { loadDraft, saveDraft, clearDraft } from "@/lib/collection-draft";
import { Field, YesNo, inputClass } from "./form-fields";
import AttachmentPicker, { type AttachmentDraft } from "./AttachmentPicker";
import Modal from "./Modal";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

type Errors = Record<string, string>;

export default function CollectionForm({ typeRoute }: { typeRoute: string }) {
  const router = useRouter();
  const config = getCollectionTypeByRoute(typeRoute) as CollectionTypeConfig;
  const has = (f: string) => config.fields.includes(f as never);

  // Draft is intentionally NOT read here in a useState initializer. Reading
  // localStorage during render runs on both the server (SSR, where it's
  // unavailable) and the client (during hydration, where it IS available),
  // so the two renders would disagree and React would throw a hydration
  // mismatch. Instead every field below starts at a plain, SSR-safe default,
  // and the draft (if any) is applied in a useEffect after mount — see below.
  const [draftRestored, setDraftRestored] = useState(false);

  const [dateCollected, setDateCollected] = useState(todayInputValue());
  const [collectedFrom, setCollectedFrom] = useState("");
  const [checkDate, setCheckDate] = useState(todayInputValue());
  const [banks, setBanks] = useState<string[]>([]);
  const [bankLoadError, setBankLoadError] = useState<string | null>(null);
  const [bank, setBank] = useState("");
  const [checkNo, setCheckNo] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("");
  const [withCwt, setWithCwt] = useState(false);
  const [amountCwt, setAmountCwt] = useState("");
  const [wvd, setWvd] = useState(false);
  const [vdpp, setVdpp] = useState<boolean | null>(null);
  const [varianceAmount, setVarianceAmount] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [paymentApplication, setPaymentApplication] = useState("");
  const [principalAccount, setPrincipalAccount] = useState("");
  const [paSuggestions, setPaSuggestions] = useState<string[]>([]);
  const [paLoadError, setPaLoadError] = useState<string | null>(null);
  const [showPaSuggestions, setShowPaSuggestions] = useState(false);
  const [cmTotalAmount, setCmTotalAmount] = useState("");
  const [othersTotalAmount, setOthersTotalAmount] = useState("");
  const [withItemReturn, setWithItemReturn] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  const [errors, setErrors] = useState<Errors>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ transRef: string; dateCreated: string } | null>(null);

  // Restore any saved draft — must happen in an effect (i.e. strictly after
  // hydration completes), not in a useState initializer, or the client's
  // first render diverges from the server-rendered HTML. Attachments and the
  // confirm password are never persisted, since File objects can't survive a
  // reload without IndexedDB.
  useEffect(() => {
    const draft = loadDraft(config.key);
    if (!draft) return;

    /* eslint-disable react-hooks/set-state-in-effect --
       Intentional: this effect bootstraps form state from localStorage once
       on mount. It can't run during render (a useState initializer) because
       localStorage is unavailable during SSR but available on the client
       during hydration — reading it there would make the server- and
       client-rendered output diverge and trigger a hydration mismatch. This
       is the "sync from an external store after mount" case, not derivable
       state. */
    if (typeof draft.dateCollected === "string") setDateCollected(draft.dateCollected);
    if (typeof draft.collectedFrom === "string") setCollectedFrom(draft.collectedFrom);
    if (typeof draft.checkDate === "string") setCheckDate(draft.checkDate);
    if (typeof draft.bank === "string") setBank(draft.bank);
    if (typeof draft.checkNo === "string") setCheckNo(draft.checkNo);
    if (typeof draft.amount === "string") setAmount(draft.amount);
    if (typeof draft.location === "string") setLocation(draft.location);
    if (typeof draft.withCwt === "boolean") setWithCwt(draft.withCwt);
    if (typeof draft.amountCwt === "string") setAmountCwt(draft.amountCwt);
    if (typeof draft.wvd === "boolean") setWvd(draft.wvd);
    if (draft.vdpp === true || draft.vdpp === false) setVdpp(draft.vdpp);
    if (typeof draft.varianceAmount === "string") setVarianceAmount(draft.varianceAmount);
    if (typeof draft.varianceReason === "string") setVarianceReason(draft.varianceReason);
    if (typeof draft.paymentApplication === "string")
      setPaymentApplication(draft.paymentApplication);
    if (typeof draft.principalAccount === "string") setPrincipalAccount(draft.principalAccount);
    if (typeof draft.cmTotalAmount === "string") setCmTotalAmount(draft.cmTotalAmount);
    if (typeof draft.othersTotalAmount === "string")
      setOthersTotalAmount(draft.othersTotalAmount);
    if (typeof draft.withItemReturn === "boolean") setWithItemReturn(draft.withItemReturn);
    if (typeof draft.remarks === "string") setRemarks(draft.remarks);

    setDraftRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [config.key]);

  useEffect(() => {
    if (has("bank")) {
      api
        .getBanks()
        .then(({ banks }) => {
          setBanks(banks.map((b) => b.bank));
          setBankLoadError(null);
        })
        .catch((err) => {
          setBankLoadError(err instanceof Error ? err.message : "Unable to load bank list.");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.key]);

  useEffect(() => {
    if (!has("principalAccount")) return;
    const t = setTimeout(() => {
      api
        .getPrincipalAccounts(principalAccount)
        .then(({ principalAccounts }) => {
          setPaSuggestions(principalAccounts);
          setPaLoadError(null);
        })
        .catch((err) => {
          setPaLoadError(err instanceof Error ? err.message : "Unable to load principal accounts.");
        });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalAccount]);

  // Debounced autosave — keeps the draft current as the user types, so a
  // dropped connection or accidental tab close doesn't lose what's filled in.
  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft(config.key, {
        dateCollected,
        collectedFrom,
        checkDate,
        bank,
        checkNo,
        amount,
        location,
        withCwt,
        amountCwt,
        wvd,
        vdpp,
        varianceAmount,
        varianceReason,
        paymentApplication,
        principalAccount,
        cmTotalAmount,
        othersTotalAmount,
        withItemReturn,
        remarks,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [
    config.key,
    dateCollected,
    collectedFrom,
    checkDate,
    bank,
    checkNo,
    amount,
    location,
    withCwt,
    amountCwt,
    wvd,
    vdpp,
    varianceAmount,
    varianceReason,
    paymentApplication,
    principalAccount,
    cmTotalAmount,
    othersTotalAmount,
    withItemReturn,
    remarks,
  ]);

  function discardDraft() {
    clearDraft(config.key);
    resetForm();
    setDraftRestored(false);
  }

  const requiresAttachment = true;

  function resetForm() {
    setDateCollected(todayInputValue());
    setCollectedFrom("");
    setCheckDate(todayInputValue());
    setBank("");
    setCheckNo("");
    setAmount("");
    setLocation("");
    setWithCwt(false);
    setAmountCwt("");
    setWvd(false);
    setVdpp(null);
    setVarianceAmount("");
    setVarianceReason("");
    setPaymentApplication("");
    setPrincipalAccount("");
    setCmTotalAmount("");
    setOthersTotalAmount("");
    setWithItemReturn(false);
    setRemarks("");
    setAttachments([]);
    setErrors({});
  }

  function validate(): boolean {
    const e: Errors = {};

    if (has("collectedFrom") && !collectedFrom.trim())
      e.collectedFrom = "Collected From is required";
    if (has("checkDate") && !checkDate) e.checkDate = "Check Date is required";
    if (has("bank") && !bank) e.bank = "Bank is required";
    if (has("checkNo") && !checkNo.trim()) e.checkNo = "Check No is required";
    if (has("amount") && !amount) e.amount = "Amount is required";
    if (has("location") && !location) e.location = "Location (Remit) is required";
    if (has("amountCwtOnly") && !amountCwt) e.amountCwt = "CWT Total Amount is required";
    if (withCwt && has("withCwt") && !amountCwt) e.amountCwt = "CWT Total Amount is required";
    if (has("paymentApplication") && !paymentApplication.trim())
      e.paymentApplication = "Payment Application is required";
    if (has("principalAccount") && !principalAccount.trim())
      e.principalAccount = "Principal Account is required";
    if (has("cmTotalAmount") && !cmTotalAmount) e.cmTotalAmount = "CM Total Amount is required";
    if (has("othersTotalAmount") && !othersTotalAmount)
      e.othersTotalAmount = "Others Amount is required";
    if (has("wvd") && wvd && vdpp === null) e.vdpp = "Check is required";
    if (has("wvd") && wvd && vdpp === false) {
      if (!varianceAmount) e.varianceAmount = "Others Amount (Var/Diff) is required";
      if (!varianceReason.trim()) e.varianceReason = "Reason is required";
    }
    if (!remarks.trim()) e.remarks = "Remarks is required";
    if (requiresAttachment && attachments.length === 0)
      e.attachments = "Attachment is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmitClick(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const ok = window.confirm("Are you sure you want to submit?");
    if (!ok) return;
    setConfirmPassword("");
    setConfirmError(null);
    setShowConfirm(true);
  }

  async function onConfirmSubmit() {
    if (!confirmPassword) {
      setConfirmError("Password is required.");
      return;
    }
    setSubmitting(true);
    setConfirmError(null);
    try {
      const form = new FormData();
      form.set("typeKey", config.key);
      form.set("confirmPassword", confirmPassword);
      if (has("dateCollected")) form.set("dateCollected", `${dateCollected}T00:00:00`);
      if (has("collectedFrom")) form.set("collectedFrom", collectedFrom);
      if (has("checkDate")) form.set("checkDate", `${checkDate}T00:00:00`);
      if (has("bank")) form.set("bank", bank);
      if (has("checkNo")) form.set("checkNo", checkNo);
      if (has("amount")) form.set("amount", amount);
      if (has("location")) form.set("location", location);
      if (has("withCwt")) form.set("withCwt", String(withCwt));
      if ((has("withCwt") && withCwt) || has("amountCwtOnly"))
        form.set("amountCwt", amountCwt);
      if (has("wvd")) {
        form.set("wvd", String(wvd));
        if (wvd) {
          form.set("vdpp", String(vdpp === true));
          if (vdpp === false) {
            form.set("othersTotalAmount", varianceAmount);
            form.set("othersReason", varianceReason);
          }
        }
      }
      if (has("paymentApplication")) form.set("paymentApplication", paymentApplication);
      if (has("principalAccount")) form.set("principalAccount", principalAccount);
      if (has("cmTotalAmount")) form.set("cmTotalAmount", cmTotalAmount);
      if (has("othersTotalAmount")) form.set("othersTotalAmount", othersTotalAmount);
      if (has("withItemReturn")) form.set("withItemReturn", String(withItemReturn));
      form.set("remarks", remarks);

      const descriptions = attachments.map((a) => a.description);
      form.set("descriptions", JSON.stringify(descriptions));
      attachments.forEach((a) => form.append("files", a.file, a.file.name));

      const res = await api.submitCollection(form);
      setShowConfirm(false);
      setSuccess(res);
      clearDraft(config.key);
      resetForm();
      setDraftRestored(false);
    } catch (err) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setConfirmError(
          "You appear to be offline. Your entries are saved as a draft — reconnect and try again."
        );
      } else {
        setConfirmError(err instanceof Error ? err.message : "Submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showVariance = has("wvd") && wvd && vdpp === false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">{config.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{config.description}</p>
      </div>

      {draftRestored && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-800">Unsaved draft restored</p>
            <p className="mt-0.5 text-xs text-amber-700">
              We brought back what you last typed. You&apos;ll need to re-attach your photo.
            </p>
          </div>
          <button
            type="button"
            onClick={discardDraft}
            className="shrink-0 rounded-lg p-1 text-amber-600 hover:bg-amber-100"
            aria-label="Discard draft"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={onSubmitClick}
        className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        {has("dateCollected") && (
          <Field label="Date Collected">
            <input
              id="dateCollected"
              name="dateCollected"
              type="date"
              value={dateCollected}
              onChange={(e) => setDateCollected(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {config.paymentMode && (
          <Field label="Payment Mode">
            <input
              id="paymentMode"
              name="paymentMode"
              readOnly
              value={config.paymentMode}
              className={`${inputClass} bg-slate-50 text-slate-500`}
            />
          </Field>
        )}

        {has("collectedFrom") && (
          <Field label="Collected From" required error={errors.collectedFrom}>
            <input
              id="collectedFrom"
              name="collectedFrom"
              value={collectedFrom}
              onChange={(e) => setCollectedFrom(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("checkDate") && (
          <Field label="Check Date" required error={errors.checkDate}>
            <input
              id="checkDate"
              name="checkDate"
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("bank") && (
          <Field label="Bank" required error={errors.bank}>
            <select id="bank" name="bank" value={bank} onChange={(e) => setBank(e.target.value)} className={inputClass}>
              <option value="">Select bank</option>
              {banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {bankLoadError && (
              <p className="text-xs text-red-600">
                {bankLoadError} — you can still type a bank manually below.
              </p>
            )}
            {bankLoadError && (
              <input
                id="bankManual"
                name="bankManual"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Type bank name"
                className={inputClass}
              />
            )}
          </Field>
        )}

        {has("checkNo") && (
          <Field label="Check No" required error={errors.checkNo}>
            <input
              id="checkNo"
              name="checkNo"
              value={checkNo}
              onChange={(e) => setCheckNo(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("amount") && (
          <Field label="Amount" required error={errors.amount}>
            <input
              id="amount"
              name="amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("amountCwtOnly") && (
          <Field label="CWT Total Amount" required error={errors.amountCwt}>
            <input
              id="amountCwtOnly"
              name="amountCwtOnly"
              type="number"
              inputMode="decimal"
              value={amountCwt}
              onChange={(e) => setAmountCwt(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("withCwt") && (
          <>
            <Field label="With CWT (2307)">
              <YesNo name="withCwt" value={withCwt} onChange={setWithCwt} />
            </Field>
            {withCwt && (
              <Field label="CWT Total Amount" required error={errors.amountCwt}>
                <input
                  id="amountCwt"
                  name="amountCwt"
                  type="number"
                  inputMode="decimal"
                  value={amountCwt}
                  onChange={(e) => setAmountCwt(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
          </>
        )}

        {has("principalAccount") && (
          <Field label="Principal Account" required error={errors.principalAccount}>
            <div className="relative">
              <input
                id="principalAccount"
                name="principalAccount"
                value={principalAccount}
                onChange={(e) => setPrincipalAccount(e.target.value)}
                onFocus={() => setShowPaSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPaSuggestions(false), 150)}
                placeholder="Enter Principal Account"
                className={`${inputClass} w-full`}
              />
              {showPaSuggestions && paSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {paSuggestions.map((p) => (
                    <li key={p}>
                      <button
                        type="button"
                        onMouseDown={() => setPrincipalAccount(p)}
                        className="block w-full px-3 py-2 text-left text-sm text-brand hover:bg-brand-light"
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {paLoadError && (
              <p className="text-xs text-red-600">
                {paLoadError} — you can still type the account name manually.
              </p>
            )}
          </Field>
        )}

        {has("cmTotalAmount") && (
          <Field label="CM Total Amount" required error={errors.cmTotalAmount}>
            <input
              id="cmTotalAmount"
              name="cmTotalAmount"
              type="number"
              inputMode="decimal"
              value={cmTotalAmount}
              onChange={(e) => setCmTotalAmount(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("othersTotalAmount") && (
          <Field label="Others Amount (Var/Diff)" required error={errors.othersTotalAmount}>
            <input
              id="othersTotalAmount"
              name="othersTotalAmount"
              type="number"
              inputMode="decimal"
              value={othersTotalAmount}
              onChange={(e) => setOthersTotalAmount(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("paymentApplication") && (
          <Field label="Payment Application (SI / SOA)" required error={errors.paymentApplication}>
            <textarea
              id="paymentApplication"
              name="paymentApplication"
              value={paymentApplication}
              onChange={(e) => setPaymentApplication(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>
        )}

        {has("withItemReturn") && (
          <Field label="With Item Return">
            <YesNo name="withItemReturn" value={withItemReturn} onChange={setWithItemReturn} />
          </Field>
        )}

        {has("wvd") && (
          <>
            <Field label="With Variance / Difference against Payment Application Total Amount Due?">
              <YesNo
                name="wvd"
                value={wvd}
                onChange={(v) => {
                  setWvd(v);
                  if (!v) {
                    setVdpp(null);
                    setVarianceAmount("");
                    setVarianceReason("");
                  }
                }}
              />
            </Field>
            {wvd && (
              <Field label="Variance / Difference due to Partial Payment?" required error={errors.vdpp}>
                <YesNo name="vdpp" value={vdpp} onChange={setVdpp} />
              </Field>
            )}
            {showVariance && (
              <>
                <Field label="Others Amount (Var/Diff)" required error={errors.varianceAmount}>
                  <input
                    id="varianceAmount"
                    name="varianceAmount"
                    type="number"
                    inputMode="decimal"
                    value={varianceAmount}
                    onChange={(e) => setVarianceAmount(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Reasons of Others Amount (Var/Diff)" required error={errors.varianceReason}>
                  <textarea
                    id="varianceReason"
                    name="varianceReason"
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </Field>
              </>
            )}
          </>
        )}

        {has("location") && (
          <Field label="Location (Remit)" required error={errors.location}>
            <select id="location" name="location" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass}>
              <option value="">Select Location</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Remarks" required error={errors.remarks}>
          <textarea
            id="remarks"
            name="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </Field>

        <AttachmentPicker
          attachments={attachments}
          setAttachments={setAttachments}
          required={requiresAttachment}
        />
        {errors.attachments && <p className="-mt-3 text-xs text-red-600">{errors.attachments}</p>}

        <button
          type="submit"
          className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Submit
        </button>
      </form>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Verification">
        <p className="mb-3 text-sm text-slate-600">Enter your password to confirm this submission.</p>
        <input
          id="confirmSubmitPassword"
          name="confirmSubmitPassword"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`${inputClass} w-full`}
          placeholder="Password"
        />
        {confirmError && <p className="mt-2 text-xs text-red-600">{confirmError}</p>}
        <button
          onClick={onConfirmSubmit}
          disabled={submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm
        </button>
      </Modal>

      <Modal
        open={!!success}
        onClose={() => {
          setSuccess(null);
          router.refresh();
        }}
        title="Transaction submitted"
      >
        {success && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm text-slate-600">Your transaction is being processed.</p>
            <div className="w-full rounded-lg bg-slate-50 p-3 text-left text-sm">
              <p className="text-slate-500">
                Reference #: <span className="font-medium text-slate-800">{success.transRef}</span>
              </p>
              <p className="text-slate-500">
                Date and Time:{" "}
                <span className="font-medium text-slate-800">
                  {new Date(success.dateCreated).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(null);
                router.refresh();
              }}
              className="mt-1 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}