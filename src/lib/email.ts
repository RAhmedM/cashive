/**
 * Email sending utilities.
 *
 * Currently a stub that logs emails in development.
 * Will integrate with Resend or SendGrid in production.
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a transactional email.
 * In development, logs to console. In production, uses Resend API.
 */
export async function sendEmail(opts: EmailOptions): Promise<void> {
  const from = process.env.FROM_EMAIL ?? "noreply@cashive.gg";

  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] Would send email (no RESEND_API_KEY configured):");
    console.log(`  From: ${from}`);
    console.log(`  To: ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`  Body: ${opts.text ?? "(HTML only)"}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Email] Failed to send to ${opts.to}:`, error);
    throw new Error(`Failed to send email: ${response.status}`);
  }
}

// ---- Template Helpers ----

export function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  return sendEmail({
    to,
    subject: "Verify your Cashive account",
    html: `
      <h2>Welcome to Cashive!</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `,
    text: `Welcome to Cashive! Verify your email: ${verifyUrl}`,
  });
}

export function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  return sendEmail({
    to,
    subject: "Reset your Cashive password",
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    `,
    text: `Reset your Cashive password: ${resetUrl}`,
  });
}

export function sendWithdrawalConfirmationEmail(
  to: string,
  amount: string,
  method: string
): Promise<void> {
  return sendEmail({
    to,
    subject: "Withdrawal confirmed — Cashive",
    html: `
      <h2>Withdrawal Processed</h2>
      <p>Your withdrawal of <strong>${amount}</strong> via <strong>${method}</strong> has been processed.</p>
      <p>Please allow time for the payment to arrive depending on your chosen method.</p>
    `,
    text: `Your withdrawal of ${amount} via ${method} has been processed.`,
  });
}
