export const CONTENT_STORES = {
  notes: "notes",
  calendar: "calendar",
  thoughts: "thoughts",
  bets: "bets",
} as const;

export type ContentType = keyof typeof CONTENT_STORES;

export function isValidContentType(value: string): value is ContentType {
  return value in CONTENT_STORES;
}
