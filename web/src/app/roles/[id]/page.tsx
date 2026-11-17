import { notFound } from "next/navigation";
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
    <main>
      <h1>{role.title}</h1>
      <p>{role.company} · {role.location_raw || "location unknown"} · <a href={role.url} target="_blank" rel="noopener noreferrer">Original posting</a></p>
      <p className="muted">Stage: {app?.stage ?? "not saved yet"}</p>
      {app ? (
        <Notes roleId={id} notes={app.notes ?? ""} assessment={app.assessment_type ?? ""} appliedAt={app.applied_at ? String(app.applied_at).slice(0, 10) : ""} />
      ) : (
        <p>Save this role from the New roles page to add notes.</p>
      )}
      <h2>Description</h2>
      <p style={{ whiteSpace: "pre-wrap" }}>{role.description}</p>
    </main>
  );
}
