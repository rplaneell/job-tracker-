import { redirect } from "next/navigation";

/** The 3D office is the front door. The rest of the app opens from it. */
export default function Home() {
  redirect("/hq");
}
