"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Mail } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import BeeLoader from "@/components/BeeLoader";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<BeeLoader size="sm" label="Loading..." />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const verify = useCallback(async () => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    try {
      const data = await api.post<{ message: string }>(
        "/api/auth/verify-email",
        { token }
      );
      setStatus("success");
      setMessage(data.message || "Email verified successfully!");

      // Redirect to home after 2 seconds
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        setMessage(err.message);
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    }
  }, [token, router]);

  useEffect(() => {
    verify();
  }, [verify]);

  async function handleResend() {
    setResending(true);
    try {
      await api.post("/api/auth/resend-verification");
      setResent(true);
    } catch {
      setMessage("Failed to resend verification email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="text-center">
      <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">
        Email Verification
      </h1>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <BeeLoader size="md" label="Verifying your email..." />
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <CheckCircle className="h-12 w-12 text-success" />
          <p className="text-sm text-text-secondary">{message}</p>
          <p className="text-xs text-text-tertiary">Redirecting...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <AlertCircle className="h-12 w-12 text-danger" />
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {message}
          </div>

          {!resent ? (
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-accent-gold/30 hover:text-accent-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <BeeLoader size="sm" label="" />
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </button>
          ) : (
            <p className="text-sm text-success">
              Verification email sent! Check your inbox.
            </p>
          )}

          <Link
            href="/login"
            className="text-xs text-text-tertiary hover:text-accent-gold transition-colors"
          >
            Back to login
          </Link>
        </div>
      )}
    </div>
  );
}
