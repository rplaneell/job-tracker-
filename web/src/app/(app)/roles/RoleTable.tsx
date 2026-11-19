"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyFilters, cityOptions, countByCountry, isLinkedInAlert, type RoleRow } from "@/lib/filters";
import { COUNTRY_CODE, FIELD, LEVEL, ago, where } from "@/lib/labels";
import { safeHref } from "@/lib/safeHref";
import { STAGES, type Stage } from "@/lib/stages";
import { browserClient } from "@/lib/supabase/client";

const PAGE = 40;

function Tags({ role, stage }: { role: RoleRow; stage?: string }) {
  return (
    <div className="tags">
      {isLinkedInAlert(role) && <span className="tag linkedin">LinkedIn alert</span>}
      {role.matched && <span className="tag match">Fits your profile</span>}
      {stage && <span className="tag saved">{stage}</span>}
      {role.field_tag && <span className="tag">{FIELD[role.field_tag] ?? role.field_tag}</span>}
      {role.level_tag && <span className="tag">{LEVEL[role.level_tag] ?? role.level_tag}</span>}
    </div>
  );
}

export default function RoleTable({ roles, stages: initialStages }: { roles: RoleRow[]; stages: Record<string, string> }) {
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState<"" | "linkedin" | "boards">("");
  const [field, setField] = useState("");
  const [search, setSearch] = useState("");
  const [matchedOnly, setMatchedOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [stages, setStages] = useState(initialStages);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  const list = useMemo(() => applyFilters(roles, { country, city, source, field, search, matchedOnly }), [roles, country, city, source, field, search, matchedOnly]);
  const cities = useMemo(() => cityOptions(roles, country || undefined), [roles, country]);
  const counts = useMemo(() => countByCountry(roles), [roles]);
  const open = openId ? roles.find((r) => r.id === openId) ?? null : null;
  const reset = () => setShown(PAGE);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function setStage(id: string, stage: Stage) {
    setError("");
    const now = new Date().toISOString();
    const row: { role_id: string; stage: Stage; updated_at: string; applied_at?: string } = { role_id: id, stage, updated_at: now };
    if (stage === "applied") row.applied_at = now;
    const { error: err } = await browserClient().from("applications").upsert(row, { onConflict: "role_id" });
    if (err) return setError("That did not save. Check your connection and try again.");
    setStages({ ...stages, [id]: stage });
  }

  async function remove(id: string) {
    setError("");
    const { error: err } = await browserClient().from("applications").delete().eq("role_id", id);
    if (err) return setError("That did not save. Check your connection and try again.");
    const next = { ...stages };
    delete next[id];
    setStages(next);
  }

  return (
    <>
      <section className="panel">
        <div className="bar">
          <label className="search">
            <span aria-hidden="true">⌕</span>
            <input id="role-search" type="search" placeholder="Search title or company" aria-label="Search roles"
              value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} />
          </label>
          <div className="seg" role="group" aria-label="Country">
            <button type="button" aria-pressed={country === ""} onClick={() => { setCountry(""); setCity(""); reset(); }}>
              All<span className="mono">{roles.length}</span>
            </button>
            {Object.entries(COUNTRY_CODE).map(([name, code]) => (
              <button key={code} type="button" aria-pressed={country === name} onClick={() => { setCountry(name); setCity(""); reset(); }}>
                {code}<span className="mono">{counts[name] ?? 0}</span>
              </button>
            ))}
          </div>
          <select id="role-source" aria-label="Source" value={source} onChange={(e) => { setSource(e.target.value as "" | "linkedin" | "boards"); reset(); }}>
            <option value="">All sources</option>
            <option value="linkedin">LinkedIn alerts</option>
            <option value="boards">Company job boards</option>
          </select>
          <select id="role-city" aria-label="City" value={city} onChange={(e) => { setCity(e.target.value); reset(); }}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c.city} value={c.city}>{c.city} ({c.count})</option>)}
          </select>
          <select id="role-field" aria-label="Field" value={field} onChange={(e) => { setField(e.target.value); reset(); }}>
            <option value="">All fields</option>
            {Object.entries(FIELD).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <label className="switch">
            <input id="role-fit" type="checkbox" checked={matchedOnly} onChange={(e) => { setMatchedOnly(e.target.checked); reset(); }} />
            Fits my profile only
          </label>
        </div>
        <div className="rows">
          {list.slice(0, shown).map((r) => (
            <button key={r.id} type="button" className="row" onClick={() => setOpenId(r.id)}>
              <div>
                <div className="t">{r.title}</div>
                <div className="c">{r.company}</div>
                <Tags role={r} stage={stages[r.id]} />
              </div>
              <div className="where">{where(r.city, r.country)}</div>
              <div className="when">{ago(r.posted_at ?? r.first_seen)}</div>
            </button>
          ))}
          {list.length === 0 && (
            <div className="empty">
              <strong>No roles match these filters</strong>
              <span>Clear the search, pick All countries, or switch off &quot;Fits my profile only&quot;.</span>
            </div>
          )}
        </div>
        {list.length > 0 && (
          <div className="more">
            <span className="mono">{Math.min(shown, list.length)} of {list.length}</span>
            {list.length > shown && <button className="btn" type="button" onClick={() => setShown(shown + PAGE)}>Show {PAGE} more</button>}
          </div>
        )}
      </section>

      {open && (
        <>
          <button className="scrim" type="button" aria-label="Close details" onClick={() => setOpenId(null)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Role details">
            <button ref={closeRef} className="x" type="button" aria-label="Close" onClick={() => setOpenId(null)}>×</button>
            <h2>{open.title}</h2>
            <Tags role={open} stage={stages[open.id]} />
            <dl className="kv">
              <dt>Company</dt><dd>{open.company}</dd>
              <dt>Where</dt><dd>{where(open.city, open.country)}</dd>
              <dt>Posted</dt><dd>{ago(open.posted_at ?? open.first_seen)}</dd>
            </dl>
            <div>
              <div className="muted" style={{ marginBottom: 6 }}>Pipeline stage</div>
              <div className="stagepick" role="group" aria-label="Pipeline stage">
                {STAGES.map((s) => (
                  <button key={s} type="button" aria-pressed={stages[open.id] === s} onClick={() => setStage(open.id, s)}>{s}</button>
                ))}
              </div>
            </div>
            {error && <p className="alert" role="alert">{error}</p>}
            <div className="actions">
              {safeHref(open.url) && <a className="btn primary" href={safeHref(open.url)} target="_blank" rel="noopener noreferrer">Open the posting</a>}
              <Link className="btn" href={`/roles/${open.id}`}>Notes and details</Link>
              {stages[open.id] && <button className="btn" type="button" onClick={() => remove(open.id)}>Remove from pipeline</button>}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
