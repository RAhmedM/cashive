"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import BeeLoader from "@/components/BeeLoader";

export default function LoginPage() {
  return (
    <Suspense fallback={<BeeLoader size="sm" label="Loading..." />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);

    try {
      const result = await login(
        email,
        password,
        needs2FA ? twoFactorCode : undefined
      );

      if (result.requires2FA) {
        setNeeds2FA(true);
        setSubmitting(false);
        return;
      }

      // Success — redirect
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Welcome Back
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Sign in to your account to continue earning
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {!needs2FA ? (
          <>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary transition-colors focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
              />
              {fieldErrors.email?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-danger">{msg}</p>
              ))}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-text-secondary"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 pr-10 text-sm text-text-primary outline-none placeholder:text-text-tertiary transition-colors focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password?.map((msg) => (
                <p key={msg} className="mt-1 text-xs text-danger">{msg}</p>
              ))}
            </div>
          </>
        ) : (
          /* 2FA Code */
          <div>
            <div className="mb-4 flex items-center justify-center gap-2 text-accent-gold">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Two-Factor Authentication</span>
            </div>
            <label
              htmlFor="twoFactorCode"
              className="mb-1.5 block text-sm font-medium text-text-secondary"
            >
              Enter your 6-digit code
            </label>
            <input
              id="twoFactorCode"
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
              className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-text-primary outline-none placeholder:text-text-tertiary transition-colors focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
            />
            <button
              type="button"
              onClick={() => {
                setNeeds2FA(false);
                setTwoFactorCode("");
                setError("");
              }}
              className="mt-2 text-xs text-text-tertiary hover:text-text-secondary"
            >
              Back to login
            </button>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-deepest transition-colors hover:bg-accent-gold-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <BeeLoader size="sm" label="" />
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              {needs2FA ? "Verify" : "Sign In"}
            </>
          )}
        </button>

        {!needs2FA && (
          <>
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-text-tertiary hover:text-accent-gold transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-bg-surface px-3 text-text-tertiary">
                  New to cashive?
                </span>
              </div>
            </div>

            <Link
              href="/register"
              className="flex w-full items-center justify-center rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-accent-gold/30 hover:text-accent-gold"
            >
              Create an Account
            </Link>
          </>
        )}
      </form>
    </>
  );
}
