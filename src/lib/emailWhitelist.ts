export function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS || "";
  return raw
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string): boolean {
  return getAllowedEmails().includes(email.trim().toLowerCase());
}
