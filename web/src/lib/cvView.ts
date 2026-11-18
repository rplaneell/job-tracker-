export type TaskLite = { status: "queued" | "claimed" | "done" | "failed"; claimed_at: string | null };
export type TailorState = "ready" | "queued" | "working";

const STALE_MINUTES = 30;

/** What the Tailor button should do for a role: start a request, or say one is already waiting or running. */
export function tailorState(tasks: TaskLite[], now: Date): TailorState {
  const working = tasks.some((t) => {
    if (t.status !== "claimed") return false;
    const at = t.claimed_at ? new Date(t.claimed_at).getTime() : Number.NaN;
    return !Number.isNaN(at) && now.getTime() - at < STALE_MINUTES * 60_000;
  });
  if (working) return "working";
  return tasks.some((t) => t.status === "queued") ? "queued" : "ready";
}

export function contactLine(cv: { email: string; phone: string; location: string }): string {
  return [cv.email, cv.phone, cv.location].filter(Boolean).join(" · ");
}
