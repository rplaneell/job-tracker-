/**
 * Gmail and Googlemail are the same inbox, but Supabase keeps accounts under the exact address it was given.
 * The owner account is stored as googlemail.com, so either spelling is turned into that one before signing in.
 */
export function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 0) return email;
  const domain = email.slice(at + 1);
  return domain === "gmail.com" ? `${email.slice(0, at)}@googlemail.com` : email;
}
