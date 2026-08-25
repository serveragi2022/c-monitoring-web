"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { CollectionTypeConfig } from "@/lib/collection-config";
import { LOCATIONS, getCollectionTypeByRoute } from "@/lib/collection-config";
import { api } from "@/lib/api-client";
import { refreshNotifications } from "@/lib/notifications-client";
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
  const [paLoadError, setPaLoadError] = useState<string | null>(null);
  const [showPaSuggestions, setShowPaSuggestions] = useState(false);
  const [cmTotalAmount, setCmTotalAmount] = useState("");
  const [othersTotalAmount, setOthersTotalAmount] = useState("");
  const [withItemReturn, setWithItemReturn] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  const [errors, setErrors] = useState<Errors>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ transRef: string; dateCreated: string } | null>(null);

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

  // Fetch the full principal-account list once (instead of re-querying on every keystroke).
  // It doubles as the allow-list used to validate the typed value on submit.
  const [paList, setPaList] = useState<string[]>([]);
  useEffect(() => {
    if (!has("principalAccount")) return;
    api
      .getPrincipalAccounts("")
      .then(({ principalAccounts }) => {
        setPaList(principalAccounts);
        setPaLoadError(null);
      })
      .catch((err) => {
        setPaLoadError(err instanceof Error ? err.message : "Unable to load principal accounts.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.key]);

  const paQuery = principalAccount.trim().toLowerCase();
  const paSuggestions = paQuery ? paList.filter((p) => p.toLowerCase().includes(paQuery)) : paList;

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
    setAttachmentDescription("");
    setAttachments([]);
    setErrors({});
  }

  function validate(): boolean {
    const e: Errors = {};

    if (has("collectedFrom") && !collectedFrom.trim())
      e.collectedFrom = "Collected From is required";
    if (has("checkDate") && !checkDate) e.checkDate = "Check Date is required";
    if (has("bank") && !bank) e.bank = "Bank is required";
    if (has("bank") && bank && banks.length > 0 && !banks.includes(bank))
      e.bank = "Select a bank from the list.";
    if (has("checkNo") && !checkNo.trim()) e.checkNo = "Check No is required";
    if (has("amount") && !amount) e.amount = "Amount is required";
    if (has("location") && !location) e.location = "Location (Remit) is required";
    if (has("amountCwtOnly") && !amountCwt) e.amountCwt = "CWT Total Amount is required";
    if (withCwt && has("withCwt") && !amountCwt) e.amountCwt = "CWT Total Amount is required";
    if (has("paymentApplication") && !paymentApplication.trim())
      e.paymentApplication = "Payment Application is required";
    if (has("principalAccount") && !principalAccount.trim())
      e.principalAccount = "Principal Account is required";
    if (has("principalAccount") && principalAccount.trim() && paList.length > 0 && !paList.includes(principalAccount))
      e.principalAccount = "Select a principal account from the list.";
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
      resetForm();
      refreshNotifications();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Submission failed.");
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

      <form
        onSubmit={onSubmitClick}
        className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        {has("dateCollected") && (
          <Field label="Date Collected">
            <input
              type="date"
              value={dateCollected}
              onChange={(e) => setDateCollected(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {config.paymentMode && (
          <Field label="Payment Mode">
            <input readOnly value={config.paymentMode} className={`${inputClass} bg-slate-50 text-slate-500`} />
          </Field>
        )}

        {has("collectedFrom") && (
          <Field label="Collected From" required error={errors.collectedFrom}>
            <input
              value={collectedFrom}
              onChange={(e) => setCollectedFrom(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("checkDate") && (
          <Field label="Check Date" required error={errors.checkDate}>
            <input
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {has("bank") && (
          <Field label="Bank" required error={errors.bank}>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className={inputClass}
              disabled={!!bankLoadError}
            >
              <option value="">Select bank</option>
              {banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">Only banks from this list can be selected.</p>
            {bankLoadError && (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <span>{bankLoadError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setBankLoadError(null);
                    api
                      .getBanks()
                      .then(({ banks }) => {
                        setBanks(banks.map((b) => b.bank));
                        setBankLoadError(null);
                      })
                      .catch((err) => {
                        setBankLoadError(err instanceof Error ? err.message : "Unable to load bank list.");
                      });
                  }}
                  className="font-medium text-brand underline"
                >
                  Retry
                </button>
              </div>
            )}
          </Field>
        )}

        {has("checkNo") && (
          <Field label="Check No" required error={errors.checkNo}>
            <input value={checkNo} onChange={(e) => setCheckNo(e.target.value)} className={inputClass} />
          </Field>
        )}

        {has("amount") && (
          <Field label="Amount" required error={errors.amount}>
            <input
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
                {paLoadError} — please retry before submitting, only listed accounts are allowed.
              </p>
            )}
            {!paLoadError && (
              <p className="mt-1 text-xs text-slate-400">Only accounts from this list can be selected.</p>
            )}
          </Field>
        )}

        {has("cmTotalAmount") && (
          <Field label="CM Total Amount" required error={errors.cmTotalAmount}>
            <input
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
                    type="number"
                    inputMode="decimal"
                    value={varianceAmount}
                    onChange={(e) => setVarianceAmount(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Reasons of Others Amount (Var/Diff)" required error={errors.varianceReason}>
                  <textarea
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
            <select value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass}>
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
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className={inputClass} />
        </Field>

        <AttachmentPicker
          attachments={attachments}
          setAttachments={setAttachments}
          description={attachmentDescription}
          setDescription={setAttachmentDescription}
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
          type="password"
          autoFocus
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
