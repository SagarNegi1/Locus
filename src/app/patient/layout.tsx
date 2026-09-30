import AuthGuard from "../../components/AuthGuard";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <TooltipProvider delayDuration={0}>
        {children}
      </TooltipProvider>
    </AuthGuard>
  );
}
