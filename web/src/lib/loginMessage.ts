/** What the login page can say about a problem. Only known codes are shown; text from the address bar is never repeated. */
export type LoginProblem = "not-owner" | "link" | "start";

const MESSAGES: Record<LoginProblem, string> = {
  "not-owner": "That GitHub account is not the owner account for this dashboard. Sign in with the GitHub account that has the owner email.",
  link: "Sign in did not finish. Try again in the same browser.",
  start: "Sign in could not start. Check your connection and try again.",
};

export function loginMessage(problem: string | null): string | null {
  return problem !== null && Object.hasOwn(MESSAGES, problem) ? MESSAGES[problem as LoginProblem] : null;
}

/** Supabase sends people back to the callback with an error_code when the provider works but the account may not enter. */
export function callbackProblem(params: URLSearchParams): LoginProblem {
  return params.get("error_code") === "signup_disabled" ? "not-owner" : "link";
}
