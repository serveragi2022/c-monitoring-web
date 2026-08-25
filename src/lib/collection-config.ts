import type { CollectionTypeKey } from "./types";
import {
  Banknote,
  FileCheck2,
  Landmark,
  ArrowDownToLine,
  Receipt,
  FileStack,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export type FieldName =
  | "dateCollected"
  | "collectedFrom"
  | "checkDate"
  | "bank"
  | "checkNo"
  | "amount"
  | "location"
  | "withCwt"
  | "wvd"
  | "paymentApplication"
  | "principalAccount"
  | "cmTotalAmount"
  | "othersTotalAmount"
  | "withItemReturn"
  | "amountCwtOnly";

export interface CollectionTypeConfig {
  key: CollectionTypeKey;
  route: string;
  title: string;
  paymentMode: string | null; // null for cwt/cm/others which don't use PaymentMode
  icon: LucideIcon;
  description: string;
  fields: FieldName[];
  endpoint: string; // API endpoint suffix
}

export const LOCATIONS = [
  "Bacolod",
  "CDO",
  "Cebu",
  "Davao",
  "Iloilo",
  "Laguna",
  "Lucena",
  "Manila",
  "Naga",
];

const STANDARD_FIELDS_BASE: FieldName[] = [
  "dateCollected",
  "collectedFrom",
  "amount",
  "withCwt",
  "wvd",
  "paymentApplication",
];

export const COLLECTION_TYPES: CollectionTypeConfig[] = [
  {
    key: "cash",
    route: "cash",
    title: "Cash",
    paymentMode: "Cash",
    icon: Banknote,
    description: "Record a cash collection with no bank or check details.",
    fields: [...STANDARD_FIELDS_BASE, "location"],
    endpoint: "collection",
  },
  {
    key: "check",
    route: "check",
    title: "Check",
    paymentMode: "Check",
    icon: FileCheck2,
    description: "Record a collection received by check.",
    fields: [
      "dateCollected",
      "collectedFrom",
      "checkDate",
      "bank",
      "checkNo",
      "amount",
      "withCwt",
      "location",
      "wvd",
      "paymentApplication",
    ],
    endpoint: "collection",
  },
  {
    key: "customer-bank-transfer",
    route: "customer-bank-transfer",
    title: "Customer Bank Transfer",
    paymentMode: "Customer Bank Transfer",
    icon: Landmark,
    description: "Record a direct bank transfer from a customer.",
    fields: [...STANDARD_FIELDS_BASE],
    endpoint: "collection",
  },
  {
    key: "customer-check-deposit",
    route: "customer-check-deposit",
    title: "Customer Check Deposit",
    paymentMode: "Customer Check Deposit",
    icon: FileCheck2,
    description: "Record a check deposited directly by a customer.",
    fields: ["dateCollected", "collectedFrom", "bank", "amount", "withCwt", "wvd", "paymentApplication"],
    endpoint: "collection",
  },
  {
    key: "customer-cash-deposit",
    route: "customer-cash-deposit",
    title: "Customer Cash Deposit",
    paymentMode: "Customer Cash Deposit",
    icon: ArrowDownToLine,
    description: "Record a cash deposit made directly by a customer.",
    fields: [...STANDARD_FIELDS_BASE],
    endpoint: "collection",
  },
  {
    key: "agent-check-deposit",
    route: "agent-check-deposit",
    title: "Agent Check Deposit",
    paymentMode: "Agent Check Deposit",
    icon: FileCheck2,
    description: "Record a check deposited on behalf of an agent.",
    fields: [
      "dateCollected",
      "collectedFrom",
      "checkDate",
      "bank",
      "checkNo",
      "amount",
      "withCwt",
      "wvd",
      "paymentApplication",
    ],
    endpoint: "collection",
  },
  {
    key: "agent-cash-deposit",
    route: "agent-cash-deposit",
    title: "Agent Cash Deposit",
    paymentMode: "Agent Cash Deposit",
    icon: ArrowDownToLine,
    description: "Record a cash deposit made on behalf of an agent.",
    fields: [...STANDARD_FIELDS_BASE],
    endpoint: "collection",
  },
  {
    key: "cwt",
    route: "cwt",
    title: "CWT (2307) - only",
    paymentMode: null,
    icon: Receipt,
    description: "Submit a certificate of withholding tax (BIR Form 2307) only.",
    fields: ["collectedFrom", "amountCwtOnly", "location"],
    endpoint: "collection/cwt",
  },
  {
    key: "cm",
    route: "cm",
    title: "CM",
    paymentMode: null,
    icon: FileStack,
    description: "Submit a credit memo against a principal account.",
    fields: ["principalAccount", "cmTotalAmount", "paymentApplication", "withItemReturn"],
    endpoint: "collection/cm",
  },
  {
    key: "others",
    route: "others",
    title: "Others",
    paymentMode: null,
    icon: MoreHorizontal,
    description: "Submit any other collection-related transaction.",
    fields: ["principalAccount", "othersTotalAmount", "paymentApplication"],
    endpoint: "collection/others",
  },
];

export function getCollectionTypeByRoute(route: string): CollectionTypeConfig | undefined {
  return COLLECTION_TYPES.find((c) => c.route === route);
}
