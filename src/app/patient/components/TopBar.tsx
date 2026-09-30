"use client";

import Brand from "@/components/Brand";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Bell, Settings, FileDown, Share2, Loader2,
  Stethoscope, Pill, FlaskConical, AlertTriangle,
  Syringe, Activity, User, Hash, Scan, type LucideIcon,
  LogOut, UserCircle, HelpCircle
} from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../../../../lib/supabase";
import type { MedicalRecord, AppNotification } from "../page";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface TopBarProps {
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  onShareClick?: () => void;
  onExportPdf?: () => Promise<void>;
  isExporting?: boolean;
  records?: MedicalRecord[];
  onSearchResultClick?: (record: MedicalRecord, boundingBox: [number, number, number, number]) => void;
  notifications?: AppNotification[];
  onNotificationClick?: (notification: AppNotification) => void;
  onAvatarClick?: () => void;
  onSignOut?: () => void;
}

export default function TopBar({ onHelpClick, onSettingsClick, onShareClick, onExportPdf, isExporting, records, onSearchResultClick, notifications = [], onNotificationClick, onAvatarClick, onSignOut }: TopBarProps) {
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("User");
  const [userEmail, setUserEmail] = useState<string>("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) return;

      const metadata = user.user_metadata as Record<string, unknown>;
      const avatar = metadata.avatar_url ?? metadata.picture;
      const name = metadata.full_name ?? metadata.name;

      setPhotoURL(typeof avatar === "string" ? avatar : null);
      setDisplayName(
        typeof name === "string" && name.trim() ? name : user.email ?? "User"
      );
      setUserEmail(user.email ?? "");
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Deep Filter Logic ────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !records) return [];

    const query = searchQuery.toLowerCase();
    const results: {
      id: string;
      record: MedicalRecord;
      type: string;
      title: string;
      subtitle: string;
      boundingBox: [number, number, number, number];
      icon: LucideIcon;
      colorClass: string;
    }[] = [];

    records.forEach((record) => {
      const data = record.extracted_data;
      if (!data) return;

      const docName = record.pdf_url ? record.pdf_url.split('/').pop() : "Document";

      const addResult = (type: string, title: string, subtitle: string, boundingBox: [number, number, number, number], icon: LucideIcon, colorClass: string) => {
        if (!title) return;
        if (title.toLowerCase().includes(query) || subtitle.toLowerCase().includes(query)) {
          results.push({
            id: `${record.id}-${type}-${title}-${Math.random()}`,
            record,
            type,
            title,
            subtitle: subtitle ? `${subtitle} · Found in ${docName}` : `Found in ${docName}`,
            boundingBox,
            icon,
            colorClass,
          });
        }
      };

      data.diagnoses?.forEach((d) => addResult("Diagnosis", d.name, "", d.boundingBox, Stethoscope, "text-blue-600 bg-blue-50"));
      data.medications?.forEach((m) => addResult("Medication", m.name, [m.dosage, m.frequency].filter(Boolean).join(" "), m.boundingBox, Pill, "text-amber-600 bg-amber-50"));
      data.labResults?.forEach((l) => addResult("Lab Result", l.testName, `${l.value} ${l.unit || ''}`, l.boundingBox, FlaskConical, "text-emerald-600 bg-emerald-50"));
      data.allergies?.forEach((a) => addResult("Allergy", a.allergen, [a.reaction, a.severity].filter(Boolean).join(" "), a.boundingBox, AlertTriangle, "text-red-600 bg-red-50"));
      data.procedures?.forEach((p) => addResult("Procedure", p.name, [p.date, p.body_part].filter(Boolean).join(" "), p.boundingBox, Syringe, "text-indigo-600 bg-indigo-50"));
      data.vitals?.forEach((v) => addResult("Vital", v.measurement, `${v.value} ${v.unit || ''}`, v.boundingBox, Activity, "text-sky-600 bg-sky-50"));
      data.physicians?.forEach((ph) => addResult("Physician", ph.name, ph.specialty || "", ph.boundingBox, User, "text-violet-600 bg-violet-50"));
      data.icdCodes?.forEach((icd) => addResult("ICD Code", icd.code, icd.description || "", icd.boundingBox, Hash, "text-pink-600 bg-pink-50"));
      data.imagingFindings?.forEach((img) => addResult("Imaging", img.bodyPart, img.finding, img.boundingBox, Scan, "text-cyan-600 bg-cyan-50"));

      // Note: Family History and Social History might not have bounding boxes in some schemas, so we check if they exist.
      // If the schema requires boundingBox, we can add them here if they have it.
      // For now, based on ExtractedDataCards, they don't seem to have boundingBox rendered, but let's safely skip if undefined.
    });

    return results.slice(0, 8); // Limit to 8 results for clean UI
  }, [searchQuery, records]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="workspace-topbar backdrop-blur-xl w-full flex justify-between items-center sticky top-0"
    >
      {/* Left: Brand / Search */}
      <div className="topbar-brand-search flex items-center gap-6">
        <Brand /><span className="topbar-workspace-label">Personal workspace</span>
        <div id="record-search" className={"record-search relative " + (mobileSearchOpen ? "is-open" : "")} ref={searchRef}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none z-10" />
          <Input
            className="w-full pl-10 pr-4 h-9 bg-slate-50/80 border-slate-200/60 rounded-full text-sm focus-visible:border-blue-300 focus-visible:ring-blue-200/40 text-slate-800 placeholder:text-slate-400 transition-all hover:bg-slate-100/60"
            aria-label="Search your records" placeholder="Find something in your records…" onKeyDown={(event) => { if (event.key === "Escape") { setIsDropdownOpen(false); setMobileSearchOpen(false); } }}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
          />

          {/* Search Dropdown */}
          <AnimatePresence>
            {isDropdownOpen && searchQuery.trim() !== "" && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="record-search-results absolute top-full left-0 mt-2 w-96 bg-white border border-slate-200/60 rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col"
              >
                {searchResults.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto py-2 divide-y divide-slate-100">
                    {searchResults.map((result) => {
                      const Icon = result.icon;
                      return (
                        <button type="button"
                          key={result.id}
                          onClick={() => {
                            if (onSearchResultClick && result.boundingBox) {
                              onSearchResultClick(result.record, result.boundingBox);
                            }
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-transparent group-hover:border-current/10 transition-colors ${result.colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-primary transition-colors">
                              {result.title}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {result.subtitle}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
                            {result.type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Search className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-900">No results found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search term</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2">
        <button className="mobile-search-toggle" aria-label="Toggle record search" aria-expanded={mobileSearchOpen} aria-controls="record-search" onClick={() => { setMobileSearchOpen(!mobileSearchOpen); if (!mobileSearchOpen) requestAnimationFrame(() => searchRef.current?.querySelector("input")?.focus()); }}><Search size={18} /></button>
        {/* Notifications Bell — shadcn DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 cursor-pointer active:scale-95 relative focus:outline-none"
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                {unreadCount} new
              </span>
            </div>

            {notifications.length > 0 ? (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onClick={() => {
                      if (onNotificationClick) {
                        onNotificationClick(notification);
                      }
                    }}
                    className={`p-4 cursor-pointer flex gap-3 rounded-none focus:bg-slate-50 ${!notification.read ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {notification.type === 'warning' ? (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
                      ) : notification.type === 'error' ? (
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Bell className="w-4 h-4" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>{notification.title}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <div className="ml-auto shrink-0 mt-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">You&apos;re all caught up!</p>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 cursor-pointer active:scale-95"
          aria-label="Gatekeeper Settings"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>

        <div className="h-6 w-px bg-slate-200/80 mx-1" />

        {/* Export & Share buttons */}
        <button
          onClick={onExportPdf}
          aria-label="Export PDF"
          disabled={isExporting}
          className="topbar-export px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all text-[13px] font-semibold cursor-pointer active:scale-95 duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          <span className="topbar-action-label">{isExporting ? "Generating..." : "Export PDF"}</span>
        </button>
        <button
          onClick={onShareClick}
          aria-label="Share summary"
          className="topbar-share px-3.5 py-2 bg-primary text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all text-[13px] font-semibold cursor-pointer active:scale-95 duration-200 flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span className="topbar-action-label">Share summary</span>
        </button>

        {/* Profile Avatar — shadcn Avatar + DropdownMenu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Profile menu"
            >
              <Avatar size="default" className="border-2 border-transparent hover:border-blue-200 transition-colors">
                <AvatarImage src={photoURL ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-primary text-white text-xs font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl">
            <DropdownMenuLabel className="py-3 px-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800 truncate">{displayName}</span>
                {userEmail && (
                  <span className="text-xs text-slate-500 truncate mt-0.5">{userEmail}</span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAvatarClick?.()} className="gap-2 py-2 px-3 cursor-pointer">
              <UserCircle className="w-4 h-4 text-slate-500" />
              <span className="text-sm">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { void onExportPdf?.(); }} disabled={isExporting} className="gap-2 py-2 px-3 cursor-pointer"><FileDown size={16} /><span>{isExporting ? "Generating PDF…" : "Export PDF"}</span></DropdownMenuItem>
            <DropdownMenuItem onClick={onHelpClick} className="gap-2 py-2 px-3 cursor-pointer"><HelpCircle size={16} /><span>Help & guidance</span></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onSignOut?.()}
              className="gap-2 py-2 px-3 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
