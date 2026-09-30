import Link from "next/link";
import Brand from "@/components/Brand";

export default function NotFound() {
  return <main className="not-found-screen"><Brand /><p className="eyebrow">404 — A missing page</p><h1>Let’s get you<br /><em>back to clarity.</em></h1><p>This page may have moved, or the link may be incomplete.</p><Link className="button-lime" href="/">Return to Locus <span aria-hidden="true">↗</span></Link></main>;
}
