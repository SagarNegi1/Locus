import Brand from "@/components/Brand";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredRole="doctor"><div className="clinical-shell"><header className="clinical-header"><Brand /><span>CLINICIAN WORKSPACE</span><Link href="/doctor">Patient directory ↗</Link></header>{children}</div></AuthGuard>;
}
