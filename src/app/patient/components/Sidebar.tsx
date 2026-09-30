"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { FolderOpen, CalendarDays, BarChart3, ScanLine, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, FileUp, Loader2 } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";

const navItems = [
  { icon: FileUp, label: "Overview", id: "upload" },
  { icon: FolderOpen, label: "Records", id: "records" },
  { icon: CalendarDays, label: "Timeline", id: "timeline" },
  { icon: BarChart3, label: "Insights", id: "analytics" },
  { icon: ScanLine, label: "Review", id: "verification" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (id: string) => void;
  onHelpClick?: () => void;
}

export default function Sidebar({ collapsed, onToggle, activeTab, onTabChange, onHelpClick }: SidebarProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const handleSignOut = async () => {
    setSigningOut(true);
    setError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not sign out. Please retry.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <nav aria-label="Patient workspace" className={"workspace-sidebar " + (collapsed ? "is-collapsed" : "")}>
      <div className="sidebar-head"><Brand /><button className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div>
      <p className="sidebar-section-label">YOUR WORKSPACE</p>
      <div className="sidebar-links">{navItems.map(({ icon: Icon, label, id }) => (
        <button key={id} className="sidebar-nav-button" onClick={() => onTabChange(id)} aria-label={label} aria-current={activeTab === id ? "page" : undefined} title={collapsed ? label : undefined}>
          {activeTab === id && <motion.div className="sidebar-active" layoutId="workspace-active" transition={{ type: "spring", stiffness: 350, damping: 35 }} />}
          <Icon size={18} strokeWidth={1.6} /><span>{label}</span>
        </button>
      ))}</div>
      <div className="sidebar-bottom"><p className="sidebar-note"><strong>A little more clarity.</strong>Your records. Your perspective.</p><button className="sidebar-nav-button" onClick={onHelpClick} aria-label="Help center"><HelpCircle size={18} strokeWidth={1.6} /><span>Help & guidance</span></button><button className="sidebar-nav-button" onClick={handleSignOut} disabled={signingOut} aria-label="Sign out">{signingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} strokeWidth={1.6} />}<span>Sign out</span></button>{error && <p role="alert" className="px-2 text-xs text-red-200">{error}</p>}</div>
    </nav>
  );
}
