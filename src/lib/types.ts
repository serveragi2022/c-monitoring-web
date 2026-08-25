export type CollectionTypeKey =
  | "cash"
  | "check"
  | "customer-bank-transfer"
  | "customer-check-deposit"
  | "customer-cash-deposit"
  | "agent-check-deposit"
  | "agent-cash-deposit"
  | "cwt"
  | "cm"
  | "others";

export interface SessionUser {
  userId: number;
  username: string;
  name: string;
  firstname: string;
  lastname: string;
  department: string;
}

/** Extends SessionUser with the plaintext password kept only in the signed, httpOnly session cookie
 *  (never sent to the browser as JSON) so we can locally re-verify it before each submission,
 *  the same way the mobile app keeps it in memory (GlobalVariable.password). */
export interface SessionPayload extends SessionUser {
  pw: string;
}
