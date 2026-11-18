import Link from "next/link";
import { notFound } from "next/navigation";
import type { CvEntry, CvItem } from "@/lib/cvText";
import { contactLine } from "@/lib/cvView";
import { serverClient } from "@/lib/supabase/server";
import VersionActions from "./VersionActions";

export const dynamic = "force-dynamic";

type Version = {
  name: string; email: string; phone: string; location: string; links: string[]; summary: string;
  education: CvEntry[]; experience: CvEntry[]; skills: CvItem[]; languages: CvItem[];
};

function Entries({ title, list }: { title: string; list: CvEntry[] }) {
  if (!list?.length) return null;
  return (
    <section>
      <h2>{title}</h2>
      {list.map((e) => (
        <div key={e.id} className="cv-entry">
          <div className="cv-entry-head"><strong>{e.title}</strong>, {e.org} <span className="cv-dates">{e.dates}</span></div>
          <ul>{e.bullets.map((b) => <li key={b.id}>{b.text}</li>)}</ul>
        </div>
      ))}
    </section>
  );
}

export default async function CvVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await serverClient();
  const { data } = await supabase.from("cv_versions").select("id,status,content,role_id,roles(title,company)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const cv = data.content as Version;
  const role = Array.isArray(data.roles) ? data.roles[0] : data.roles;

  return (
    <>
      <div className="head no-print">
        <div>
          <p><Link href="/cv">← Your CV</Link></p>
          <h1>{role ? `${role.title} at ${role.company}` : "Tailored CV"}</h1>
          <p>Status: <strong>{data.status}</strong>. Check every line before you use it. Claude Code only reworded your master CV, but you are the one who answers for it.</p>
        </div>
        <VersionActions id={data.id} status={data.status} roleId={data.role_id} />
      </div>
      <article className="cv-sheet panel">
        <h1>{cv.name}</h1>
        <p className="cv-contact">{contactLine(cv)}</p>
        {cv.links?.length ? <p className="cv-contact">{cv.links.join(" · ")}</p> : null}
        {cv.summary ? <section><h2>Summary</h2><p>{cv.summary}</p></section> : null}
        <Entries title="Experience" list={cv.experience} />
        <Entries title="Education" list={cv.education} />
        {cv.skills?.length ? <section><h2>Skills</h2><p>{cv.skills.map((s) => s.text).join(" · ")}</p></section> : null}
        {cv.languages?.length ? <section><h2>Languages</h2><p>{cv.languages.map((s) => s.text).join(" · ")}</p></section> : null}
      </article>
    </>
  );
}
