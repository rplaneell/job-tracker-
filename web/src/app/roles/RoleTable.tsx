"use client";
import { useMemo, useState } from "react";
import { applyFilters, type RoleRow } from "@/lib/filters";
import { browserClient } from "@/lib/supabase/client";

const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();

export default function RoleTable({ roles, savedIds }: { roles: RoleRow[]; savedIds: string[] }) {
  const [city, setCity] = useState("");
  const [field, setField] = useState("");
  const [company, setCompany] = useState("");
  const [level, setLevel] = useState("");
  const [matchedOnly, setMatchedOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(new Set(savedIds));

  const shown = useMemo(
    () => applyFilters(roles, { city, field, company, level, matchedOnly, search }),
    [roles, city, field, company, level, matchedOnly, search],
  );

  async function save(id: string) {
    const { error } = await browserClient().from("applications").insert({ role_id: id });
    if (!error) setSaved(new Set(saved).add(id));
  }

  const select = (label: string, value: string, set: (v: string) => void, options: string[]) => (
    <label>
      {label}
      <select value={value} onChange={(e) => set(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <div className="filters">
        <label>Search<input value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        {select("City", city, setCity, uniq(roles.map((r) => r.city)))}
        {select("Field", field, setField, uniq(roles.map((r) => r.field_tag)))}
        {select("Company", company, setCompany, uniq(roles.map((r) => r.company)))}
        {select("Level", level, setLevel, uniq(roles.map((r) => r.level_tag)))}
        <label><input type="checkbox" checked={matchedOnly} onChange={(e) => setMatchedOnly(e.target.checked)} /> Relevant only</label>
      </div>
      <p className="muted">{shown.length} roles</p>
      <table>
        <thead><tr><th>Role</th><th>Company</th><th>City</th><th>Field</th><th>First seen</th><th></th></tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id}>
              <td><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></td>
              <td>{r.company}</td>
              <td>{r.city ?? "?"}</td>
              <td>{r.field_tag ?? ""}</td>
              <td>{r.first_seen.slice(0, 10)}</td>
              <td>{saved.has(r.id) ? "Saved" : <button onClick={() => save(r.id)}>Save</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
