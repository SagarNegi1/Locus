import Link from "next/link";

export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="locus-brand" aria-label="Locus home">
      <span className="locus-mark" aria-hidden="true"><i /><i /><i /><i /></span>
      {!compact && <span>locus<span className="brand-period">.</span></span>}
    </Link>
  );
}
