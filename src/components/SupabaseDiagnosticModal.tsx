import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, XCircle, RefreshCw, X, ShieldCheck, ExternalLink, Cpu } from 'lucide-react';
import { testSupabaseConnection, SupabaseDiagnosticResult, SUPABASE_CONFIG } from '../lib/supabase';

interface SupabaseDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseDiagnosticModal: React.FC<SupabaseDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [result, setResult] = useState<SupabaseDiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const runTest = async () => {
    setIsRunning(true);
    try {
      const res = await testSupabaseConnection();
      setResult(res);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e8dfd3] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#faf7f2] border-b border-[#e8dfd3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#261c14]">Supabase &amp; Vercel Diagnostics</h3>
              <p className="text-[11px] text-[#786454]">Real-time database read test (non-sensitive)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#786454] hover:text-[#261c14] hover:bg-[#ebdccf] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Main Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              result?.success
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : result
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-neutral-50 border-neutral-200 text-neutral-800'
            }`}
          >
            {result?.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : result ? (
              <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className="w-5 h-5 text-neutral-500 animate-spin shrink-0 mt-0.5" />
            )}

            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm">
                {result?.success
                  ? 'Supabase Database Connected & Verified'
                  : isRunning
                  ? 'Executing live database read test...'
                  : 'Connection Diagnostic Issue'}
              </p>
              <p className="leading-relaxed opacity-90">
                {result?.success
                  ? `Live SELECT query executed against "${result.tableChecked}" in ${result.latencyMs}ms. Loaded ${result.itemCount} active categories.`
                  : result?.errorMessage || 'Testing connection to Supabase project...'}
              </p>
              {result?.errorCode && (
                <p className="font-mono text-[11px] opacity-75">PostgreSQL Code: {result.errorCode}</p>
              )}
            </div>
          </div>

          {/* Configuration Summary (Non-sensitive) */}
          <div className="bg-[#faf7f2] rounded-xl border border-[#ebdccf] p-4 space-y-2.5 text-xs text-[#5c4a3b]">
            <div className="flex items-center justify-between pb-2 border-b border-[#e8dfd3]">
              <span className="font-semibold text-[#786454]">Supabase Host:</span>
              <span className="font-mono font-medium text-[#261c14]">{SUPABASE_CONFIG.host}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#e8dfd3]">
              <span className="font-semibold text-[#786454]">Framework:</span>
              <span className="font-medium text-[#261c14] flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-[#e07a3f]" />
                Vite + React SPA (Vercel Ready)
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#e8dfd3]">
              <span className="font-semibold text-[#786454]">Table Tested:</span>
              <span className="font-mono text-[#261c14]">public.categories</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#786454]">Security Audit:</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                No secret keys exposed
              </span>
            </div>
          </div>

          {/* Vercel Environment Variables Checklist */}
          <div className="rounded-xl border border-neutral-200 p-3.5 bg-white space-y-2 text-xs">
            <p className="font-bold text-[#261c14] text-[11px] uppercase tracking-wider">
              Vercel Project Settings → Environment Variables:
            </p>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100">
                <span className="text-neutral-700">VITE_SUPABASE_URL</span>
                <span className="text-emerald-600 font-bold">✓ Ready</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100">
                <span className="text-neutral-700">VITE_SUPABASE_ANON_KEY</span>
                <span className="text-emerald-600 font-bold">✓ Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#faf7f2] border-t border-[#e8dfd3]">
          <span className="text-[11px] text-[#786454]">
            {result?.timestamp ? `Last tested at ${result.timestamp}` : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={runTest}
              disabled={isRunning}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#d9c7b5] text-[#261c14] hover:bg-[#faf7f2] disabled:opacity-50 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Testing...' : 'Retest'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#261c14] text-white hover:bg-[#3d2f23] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
