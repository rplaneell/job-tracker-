import Link from "next/link";
import { formatCvText, type CvMaster } from "@/lib/cvText";
import { ago } from "@/lib/labels";
import { serverClient } from "@/lib/supabase/server";
import { isJpegDataUrl } from "@/lib/cvPhoto";
import CvEditor from "./CvEditor";
import PhotoSettings from "./PhotoSettings";

export const dynamic = "force-dynamic";

type VersionRow = { id: string; status: string; created_at: string; roles: { title: string; company: string } | { title: string; company: string }[] | null };

export default async function CvPage() {
  const supabase = await serverClient();
  const [master, versions] = await Promise.all([
    supabase.from("cv_master").select("content,photo").maybeSingle(),
    supabase.from("cv_versions").select("id,status,created_at,roles(title,company)").order("created_at", { ascending: false }).limit(50),
  ]);
  let initial = "";
  try {
    if (master.data?.content) initial = formatCvText(master.data.content as CvMaster);
  } catch {
    initial = ""; // a damaged saved CV never breaks the page; the owner can paste it again
  }
  const list = (versions.data ?? []) as VersionRow[];

  return (
    <>
      <div className="head">
        <div>
          <h1>Your CV</h1>
          <p>Keep one master CV here. For each role, ask Claude Code for a tailored draft. It only reorders and rewords what is already in your master CV.</p>
        </div>
      </div>
      <section className="panel note">
        <h2>Master CV</h2>
        <CvEditor initial={initial} />
      </section>
      <section className="panel note">
        <h2>Photo</h2>
        <PhotoSettings hasMaster={Boolean(master.data)} initial={isJpegDataUrl(master.data?.photo) ? master.data!.photo : null} />
      </section>
      <section className="panel note">
        <h2>Tailored drafts</h2>
        {list.length === 0 ? (
          <p className="muted">None yet. Open a role and press Tailor my CV.</p>
        ) : (
          <ul>
            {list.map((v) => {
              const role = Array.isArray(v.roles) ? v.roles[0] : v.roles;
              return (
                <li key={v.id}>
                  <Link href={`/cv/${v.id}`}>{role ? `${role.title} at ${role.company}` : "Role no longer listed"}</Link>{" "}
                  <span className={`tag ${v.status === "approved" ? "match" : ""}`}>{v.status}</span>{" "}
                  <span className="muted">{ago(v.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
