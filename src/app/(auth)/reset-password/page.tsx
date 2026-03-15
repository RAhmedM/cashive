"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import BeeLoader from "@/components/BeeLoader";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One digit", test: (p: string) => /\d/.test(p) },
];

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<BeeLoader size="sm" label="Loading..." />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }

    if (!passwordValid) {
      setError("Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/api/auth/reset-password", { token, password });
      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="flex flex-col items-center gap-4 py-8">
          <CheckCircle className="h-12 w-12 text-success" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Password Reset
          </h1>
          <p className="text-sm text-text-secondary">
            Your password has been reset successfully. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Reset Password
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* New Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
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

          {/* Password rules */}
          {password.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password);
                return (
                  <div
                    key={rule.label}
                    className={`flex items-center gap-1 text-[11px] ${
                      passed ? "text-success" : "text-text-tertiary"
                    }`}
                  >
                    <Check
                      className={`h-3 w-3 ${passed ? "opacity-100" : "opacity-30"}`}
                    />
                    {rule.label}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
            className={`w-full rounded-lg border bg-bg-elevated px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary transition-colors focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20 ${
              confirmPassword.length > 0
                ? passwordsMatch
                  ? "border-success/40"
                  : "border-danger/40"
                : "border-border"
            }`}
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-xs text-danger">Passwords do not match</p>
          )}
        </div>

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
              <KeyRound className="h-4 w-4" />
              Reset Password
            </>
          )}
        </button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-xs text-text-tertiary hover:text-accent-gold transition-colors"
          >
            Back to login
          </Link>
        </div>
      </form>
    </>
  );
}
