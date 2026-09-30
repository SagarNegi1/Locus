"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, X, Loader2, Save, AlertTriangle } from "lucide-react";
import { supabase } from '@/utils/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface GatekeeperSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function GatekeeperSettingsModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: GatekeeperSettingsModalProps) {
  const [strictIdentityMatch, setStrictIdentityMatch] = useState(false);
  const [allergySensitivity, setAllergySensitivity] = useState<"high" | "low">("high");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadSettings = async () => {
        setIsLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata?.gatekeeper_prefs) {
            setStrictIdentityMatch(user.user_metadata.gatekeeper_prefs.strictIdentityMatch ?? false);
            setAllergySensitivity(user.user_metadata.gatekeeper_prefs.allergySensitivity ?? "high");
          }
        } catch (err) {
          console.error("Failed to load gatekeeper settings", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadSettings();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const currentPrefs = user.user_metadata?.gatekeeper_prefs || {};
      const newPrefs = {
        ...currentPrefs,
        strictIdentityMatch,
        allergySensitivity
      };

      const { error } = await supabase.auth.updateUser({
        data: { gatekeeper_prefs: newPrefs }
      });

      if (error) throw error;
      
      onSuccess("Gatekeeper settings updated successfully");
      onClose();
    } catch (err) {
      console.error("Failed to update gatekeeper settings", err);
      onError(err instanceof Error ? err.message : "Failed to update gatekeeper settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-white/20 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50 rounded-3xl [&>button[aria-label='Close']]:hidden">
        {/* Glass gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-transparent to-orange-50/30 pointer-events-none" />

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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/25 shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                Gatekeeper Controls
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-0.5">
                Set your AI risk tolerance
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Warning Alert */}
          <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200/60 flex gap-3 shadow-sm">
            <div className="shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold block mb-0.5">AI Behavior:</span>
              These settings adjust how strictly the AI filters incoming medical documents and flags potential conflicts.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6 mb-8">
              
              {/* Strict Identity Match Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-bold text-slate-800 block mb-1">
                    Strict Identity Match
                  </Label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Block all uploads where the name doesn&apos;t match perfectly.
                  </p>
                </div>
                <Switch
                  checked={strictIdentityMatch}
                  onCheckedChange={setStrictIdentityMatch}
                  className="data-[state=checked]:bg-red-600"
                />
              </div>

              <div className="h-px bg-slate-100" />

              {/* Allergy Sensitivity Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-bold text-slate-800 block mb-1">
                    Allergy Sensitivity
                  </Label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {allergySensitivity === 'high' 
                      ? "Flag all potential interactions (High Noise)" 
                      : "Flag only critical conflicts (Low Noise)"}
                  </p>
                </div>
                <Switch
                  checked={allergySensitivity === 'high'}
                  onCheckedChange={(checked) => setAllergySensitivity(checked ? 'high' : 'low')}
                  className="data-[state=checked]:bg-red-600"
                />
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
              className="flex-[2] py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Controls
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
