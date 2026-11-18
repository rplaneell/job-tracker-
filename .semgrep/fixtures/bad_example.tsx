// Deliberately BAD code. Never shipped or run. The Semgrep self test fails if any rule does not fire on it.
export function show(el: HTMLElement, name: string) { el.innerHTML = "<b>" + name + "</b>"; }
export function run(code: string) { return eval(code); }
export const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const a = <a href="https://example.invalid" target="_blank">x</a>;
export function popup(u: string) { window.open(u); }
