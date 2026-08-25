import "server-only";

// Mirrors collectionMS/Class/GlobalVariable.cs
export const COLLECTION_API_BASE =
  process.env.COLLECTION_API_BASE_URL || "https://agi-cmonitoring.atlanticgrains.com/api/";
export const ORDERING_API_BASE =
  process.env.ORDERING_API_BASE_URL || "https://agi-ordering.atlanticgrains.com/api/";

// The mobile app sends a literal, unchanged Basic auth header: base64("Username:Password").
const BACKEND_BASIC_AUTH = process.env.BACKEND_BASIC_AUTH || "Username:Password";


export function authHeader(): string {
  return "Basic " + BACKEND_BASIC_AUTH;
}

export function collectionUrl(path: string): string {
  return new URL(path, COLLECTION_API_BASE).toString();
}

export function orderingUrl(path: string): string {
  return new URL(path, ORDERING_API_BASE).toString();
}
