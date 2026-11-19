"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_PHOTO_CHARS, isJpegDataUrl } from "@/lib/cvPhoto";
import { browserClient } from "@/lib/supabase/client";

const MAX_SIDE = 400;

/** Shrinks any picture to a small jpeg in the browser, so only a safe, light image is ever stored. */
async function toSmallJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.88, 0.8, 0.7, 0.6]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_PHOTO_CHARS - 1000) return url;
  }
  throw new Error("too big");
}

export default function PhotoSettings({ hasMaster, initial }: { hasMaster: boolean; initial: string | null }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(initial);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save(next: string | null) {
    setState("saving");
    setMessage("");
    const { error } = await browserClient().from("cv_master").update({ photo: next }).eq("id", true);
    if (error) {
      setState("error");
      return setMessage("That did not save. Check your connection and try again.");
    }
    setPhoto(next);
    setState("idle");
    setMessage(next ? "Photo saved." : "Photo removed.");
    router.refresh();
  }

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await toSmallJpeg(file);
      if (!isJpegDataUrl(url)) throw new Error("not a jpeg");
      await save(url);
    } catch {
      setState("error");
      setMessage("That picture could not be used. Try a normal JPEG or PNG photo.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p className="muted">Your photo appears only on tailored CVs for roles in Barcelona. CVs for every other place are made without it. The photo stays in your own database.</p>
      {!hasMaster && <p className="alert" role="alert">Save your master CV first, then add the photo.</p>}
      {photo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={photo} alt="Your CV photo" width={90} height={120} style={{ objectFit: "cover", objectPosition: "top", borderRadius: 4 }} />}
      <div className="actions">
        <label className="btn" style={{ cursor: hasMaster ? "pointer" : "default", opacity: hasMaster ? 1 : 0.6 }}>
          {photo ? "Replace photo" : "Add photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={!hasMaster || state === "saving"} style={{ display: "none" }} />
        </label>
        {photo && <button className="btn" type="button" onClick={() => save(null)} disabled={state === "saving"}>Remove photo</button>}
      </div>
      {message && <p className={state === "error" ? "alert" : "status"} role={state === "error" ? "alert" : "status"}>{message}</p>}
    </div>
  );
}
