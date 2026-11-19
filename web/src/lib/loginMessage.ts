/** The sentence the login page shows for a problem. Never repeats text taken from the address bar. */
export type LoginProblem = { status?: number; code?: string; page?: string } | null;

export function loginMessage(problem: LoginProblem): string | null {
  if (!problem) return null;
  if (problem.status === 429 || problem.code === "over_email_send_rate_limit") {
    return "Too many links were requested. Wait about a minute, then ask for one new link and use only the newest email.";
  }
  if (problem.page === "link") {
    return "That link could not sign you in. Open it in the same browser where you asked for it, then ask for a new link.";
  }
  if (problem.page !== undefined) return null; // an unknown value from the address bar says nothing
  return "That email cannot sign in. Use the owner email set up in Supabase.";
}
