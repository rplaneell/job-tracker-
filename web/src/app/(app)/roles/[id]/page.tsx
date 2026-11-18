import Link from "next/link";
import { notFound } from "next/navigation";
import { FIELD, LEVEL, ago, where } from "@/lib/labels";
import { serverClient } from "@/lib/supabase/server";
import Notes from "./Notes";

export const dynamic = "force-dynamic";

export default async function RoleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await serverClient();
  const { data: role } = await supabase.from("roles").select("*").eq("id", id).maybeSingle();
  if (!role) notFound();
  const { data: app } = await supabase.from("applications").select("*").eq("role_id", id).maybeSingle();

  return (
    <>
      <div className="head">
        <div>
          <p><Link href="/">← Roles</Link></p>
          <h1>{role.title}</h1>
          <p>{role.company} · {where(role.city, role.country)} · posted {ago(role.posted_at ?? role.first_seen)}</p>
          <div className="tags">
            {role.matched && <span className="tag match">Fits your profile</span>}
            {role.field_tag && <span className="tag">{FIELD[role.field_tag] ?? role.field_tag}</span>}
            {role.level_tag && <span className="tag">{LEVEL[role.level_tag] ?? role.level_tag}</span>}
          </div>
        </div>
        <a className="btn primary" href={role.url} target="_blank" rel="noopener noreferrer">Open the posting</a>
      </div>
      <div className="detail">
        <section className="panel">
          <div className="bar"><h2 style={{ fontSize: 15 }}>Description</h2></div>
          <div className="prose">{role.description || "The source gave no description. Open the posting to read it."}</div>
        </section>
        <section className="panel note">
          <h2>Your notes</h2>
          {app ? (
            <>
              <p className="muted">Stage: <strong style={{ textTransform: "capitalize" }}>{app.stage}</strong></p>
              <Notes roleId={id} notes={app.notes ?? ""} assessment={app.assessment_type ?? ""}
                appliedAt={app.applied_at ? String(app.applied_at).slice(0, 10) : ""} />
            </>
          ) : (
            <p>Pick a pipeline stage for this role on the Roles page to start taking notes.</p>
          )}
        </section>
      </div>
    </>
  );
}
