"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import BeeLoader from "@/components/BeeLoader";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One digit", test: (p: string) => /\d/.test(p) },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const passwordValid = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

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
      await register({
        email,
        password,
        username,
        referralCode: referralCode || undefined,
      });

      // Success — redirect to dashboard
      router.push("/");
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
          Create Your Account
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Start earning Honey in minutes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

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

        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))
            }
            placeholder="your_username"
            required
            autoComplete="username"
            minLength={3}
            maxLength={20}
            className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary transition-colors focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
          />
          <p className="mt-1 text-xs text-text-tertiary">
            3-20 characters, letters, numbers, and underscores only
          </p>
          {fieldErrors.username?.map((msg) => (
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
                    <Check className={`h-3 w-3 ${passed ? "opacity-100" : "opacity-30"}`} />
                    {rule.label}
                  </div>
                );
              })}
            </div>
          )}
          {fieldErrors.password?.map((msg) => (
            <p key={msg} className="mt-1 text-xs text-danger">{msg}</p>
          ))}
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

        {/* Referral Code (optional, collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowReferral((v) => !v)}
            className="text-xs text-text-tertiary hover:text-accent-gold transition-colors"
          >
            {showReferral ? "Hide referral code" : "Have a referral code?"}
          </button>
          {showReferral && (
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.trim())}
              placeholder="Enter referral code"
              className="mt-2 w-full rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary transition-colors focus:border-accent-gold/40 focus:ring-1 focus:ring-accent-gold/20"
            />
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
              <UserPlus className="h-4 w-4" />
              Create Account
            </>
          )}
        </button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-bg-surface px-3 text-text-tertiary">
              Already have an account?
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-accent-gold/30 hover:text-accent-gold"
        >
          Sign In
        </Link>
      </form>
    </>
  );
}
