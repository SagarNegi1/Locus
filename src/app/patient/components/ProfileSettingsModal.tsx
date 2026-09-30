"use client";

import { useState, useEffect } from "react";
import { UserCircle, X, Loader2, AlertTriangle, Save } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onSettingsUpdate?: (sex: string, bloodType: string, language: string) => void;
}

const SEX_OPTIONS = ["Male", "Female", "Other", "Unknown"];
const BLOOD_TYPE_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "German", "Chinese", 
  "Tagalog", "Vietnamese", "Arabic", "Korean", "Russian", "Other"
];

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  onSettingsUpdate,
}: ProfileSettingsModalProps) {
  const [sex, setSex] = useState("Unknown");
  const [bloodType, setBloodType] = useState("Unknown");
  const [language, setLanguage] = useState("English");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadProfile = async () => {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata) {
            setSex(user.user_metadata.sex || "Unknown");
            setBloodType(user.user_metadata.blood_type || "Unknown");
            setLanguage(user.user_metadata.language || "English");
          }
        } catch (err) {
          console.error("Failed to load profile settings", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadProfile();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.auth.updateUser({
        data: { sex, blood_type: bloodType, language }
      });

      if (error) throw error;
      
      onSettingsUpdate?.(sex, bloodType, language);
      onSuccess("Clinical Ground Truth updated successfully");
      onClose();
    } catch (err) {
      console.error("Failed to update profile settings", err);
      onError(err instanceof Error ? err.message : "Failed to update profile settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-white/20 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50 rounded-3xl [&>button[aria-label='Close']]:hidden">
        {/* Glass gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/30 pointer-events-none" />

        {/* Content */}
        <div className="relative p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <DialogHeader className="flex flex-row items-center gap-4 mb-6 space-y-0 text-left">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <UserCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                Clinical Ground Truth
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-0.5">
                Manage core patient demographics
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Warning Alert */}
          <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200/60 flex gap-3 shadow-sm">
            <div className="shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold block mb-0.5">Important:</span>
              Changing these values directly impacts how the AI analyzes your lab results and language translations.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-5 mb-8">
              {/* Biological Sex */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                  Biological Sex
                </Label>
                <Select value={sex} onValueChange={setSex}>
                  <SelectTrigger className="w-full bg-white border border-slate-200 rounded-xl h-auto py-3 px-4 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {SEX_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Blood Type */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                  Blood Type
                </Label>
                <Select value={bloodType} onValueChange={setBloodType}>
                  <SelectTrigger className="w-full bg-white border border-slate-200 rounded-xl h-auto py-3 px-4 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer">
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {BLOOD_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Language */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                  Primary Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full bg-white border border-slate-200 rounded-xl h-auto py-3 px-4 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
