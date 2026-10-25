import React, { useState } from 'react';
import { Lock, Mail, Shield, AlertCircle, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { cafeteriaService } from '../../services/cafeteriaService';
import { AdminUser } from '../../types/cafeteria';
import { isSupabaseConfigured } from '../../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onBackToCustomerSite: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToCustomerSite,
}) => {
  const [email, setEmail] = useState<string>('admin@grillinn.in');
  const [password, setPassword] = useState<string>('admin123');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user = await cafeteriaService.loginAdmin(email, password);
      onLoginSuccess(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@grillinn.in');
    setPassword('admin123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#faf7f2]">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-[#e8dfd3] shadow-xl">
        {/* Top Back Nav */}
        <button
          onClick={onBackToCustomerSite}
          className="inline-flex items-center gap-1.5 text-xs text-[#786454] hover:text-[#261c14] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Restaurant Storefront</span>
        </button>

        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-[#8b181b] to-[#c52227] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-[#261c14] tracking-tight">
            Grill Inn Owner Portal
          </h1>
          <p className="text-xs text-[#786454] mt-1">
            Shop No. 1, Chuabagh, Munger · Live Orders, KOTs &amp; Restaurant Settings
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5c4a3b] mb-1">
              Admin / Owner Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#877260] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dailyroast.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#d9c7b5] text-sm text-[#261c14] focus:ring-2 focus:ring-[#e07a3f] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5c4a3b] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#877260] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#d9c7b5] text-sm text-[#261c14] focus:ring-2 focus:ring-[#e07a3f] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#261c14] hover:bg-[#3d2f23] disabled:bg-[#877260] text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Owner...</span>
              </>
            ) : (
              <span>Sign In to Admin Dashboard</span>
            )}
          </button>
        </form>

        {/* Demo Fast-Fill Helper Box */}
        <div className="pt-4 border-t border-[#f0e6da]">
          <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#d9c7b5] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#5c4a3b] flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[#e07a3f]" />
                Demo Credentials Quick-Fill
              </span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[11px] font-bold text-[#e07a3f] hover:underline"
              >
                Autofill
              </button>
            </div>
            <div className="text-[11px] text-[#786454] space-y-0.5 font-mono">
              <div>Email: <strong>admin@grillinn.in</strong></div>
              <div>Password: <strong>admin123</strong></div>
            </div>
            <div className="text-[10px] text-[#877260] italic">
              {isSupabaseConfigured()
                ? '🟢 Supabase connected: real Supabase Auth active'
                : '🟡 Supabase keys not set yet: local secure auth active'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
