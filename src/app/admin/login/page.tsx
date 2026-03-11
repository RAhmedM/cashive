"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, Shield, Lock } from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          twoFactorCode: needs2FA ? twoFactorCode : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setSubmitting(false);
        return;
      }

      if (data.requires2FA) {
        setNeeds2FA(true);
        setSubmitting(false);
        return;
      }

      // Success — redirect to admin dashboard
      router.push(redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1117] px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A1D27] border border-[#2A2D37]">
            <Lock className="h-6 w-6 text-[#F5A623]" />
          </div>
          <h1 className="text-xl font-semibold text-white">Admin Login</h1>
          <p className="mt-1 text-sm text-[#8B8D97]">
            cashive.gg administration
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-[#2A2D37] bg-[#1A1D27] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {!needs2FA ? (
              <>
                {/* Email */}
                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-1.5 block text-sm font-medium text-[#8B8D97]"
                  >
                    Email
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cashive.gg"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-4 py-2.5 text-sm text-white outline-none placeholder:text-[#4A4D57] transition-colors focus:border-[#F5A623]/40 focus:ring-1 focus:ring-[#F5A623]/20"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="admin-password"
                    className="mb-1.5 block text-sm font-medium text-[#8B8D97]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-4 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-[#4A4D57] transition-colors focus:border-[#F5A623]/40 focus:ring-1 focus:ring-[#F5A623]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4D57] hover:text-[#8B8D97]"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* 2FA Code */
              <div>
                <div className="mb-4 flex items-center justify-center gap-2 text-[#F5A623]">
                  <Shield className="h-5 w-5" />
                  <span className="text-sm font-medium">Two-Factor Authentication</span>
                </div>
                <label
                  htmlFor="admin-2fa"
                  className="mb-1.5 block text-sm font-medium text-[#8B8D97]"
                >
                  Enter your 6-digit code
                </label>
                <input
                  id="admin-2fa"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) =>
                    setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-white outline-none placeholder:text-[#4A4D57] transition-colors focus:border-[#F5A623]/40 focus:ring-1 focus:ring-[#F5A623]/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNeeds2FA(false);
                    setTwoFactorCode("");
                    setError("");
                  }}
                  className="mt-2 text-xs text-[#4A4D57] hover:text-[#8B8D97]"
                >
                  Back to login
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F5A623] px-4 py-2.5 text-sm font-semibold text-[#0F1117] transition-colors hover:bg-[#FFBE42] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F1117]/30 border-t-[#0F1117]" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {needs2FA ? "Verify" : "Sign In"}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#4A4D57]">
          Admin access only. Unauthorized access attempts are logged.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F1117]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2A2D37] border-t-[#F5A623]" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
