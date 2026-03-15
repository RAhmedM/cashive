/**
 * Email sending utilities with branded cashive.gg templates.
 *
 * Uses Resend API in production when RESEND_API_KEY is set.
 * Falls back to console logging in development.
 */
import { emailLogger } from "@/lib/logger";

// ---- Design Tokens ----

const colors = {
  pageBg: "#0D0B0E",
  cardBg: "#1A1520",
  elevatedBg: "#241E2C",
  accent: "#F5A623",
  textPrimary: "#F0ECE4",
  textSecondary: "#9B95A0",
  border: "#2A2433",
  success: "#34C759",
} as const;

const fontStack = "Arial, Helvetica, sans-serif";

// ---- Layout Helper ----

/**
 * Wraps email body content in the branded cashive.gg shell.
 * All CSS is inline for maximum email-client compatibility.
 */
function emailLayout(content: string): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>cashive.gg</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.pageBg};font-family:${fontStack};-webkit-font-smoothing:antialiased;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${colors.pageBg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Card -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:${colors.cardBg};border:1px solid ${colors.border};border-radius:12px;overflow:hidden;">
          <!-- Rounded-corner trick: outer cell with padding -->
          <tr>
            <td style="padding:40px 32px 32px 32px;">
              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <span style="font-family:${fontStack};font-size:28px;font-weight:700;color:${colors.textPrimary};letter-spacing:-0.5px;">cash<span style="color:${colors.accent};">ive</span><span style="color:${colors.textSecondary};font-weight:400;">.gg</span></span>
                  </td>
                </tr>
              </table>
              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:28px;">
                    <div style="height:2px;background-color:${colors.accent};border-radius:1px;"></div>
                  </td>
                </tr>
              </table>
              <!-- Content -->
              ${content}
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:24px 32px 0 32px;">
              <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.textSecondary};">
                cashive.gg &mdash; Where Your Time Turns to Honey
              </p>
              <p style="margin:8px 0 0 0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.textSecondary};">
                &copy; ${year} cashive.gg. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---- CTA Button Helper ----

function ctaButton(
  href: string,
  label: string,
  bgColor: string = colors.accent,
  textColor: string = colors.pageBg
): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:28px 0;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 36px;background-color:${bgColor};color:${textColor};font-family:${fontStack};font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

// ---- Core Send Function ----

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
    emailLogger.info(
      { from, to: opts.to, subject: opts.subject, body: opts.text ?? "(HTML only)" },
      "Would send email (no RESEND_API_KEY configured)"
    );
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
    emailLogger.error({ to: opts.to, error }, "Failed to send email");
    throw new Error(`Failed to send email: ${response.status}`);
  }
}

// ---- Template: Verify Email ----

export function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  const content = `
    <h1 style="margin:0 0 12px 0;font-family:${fontStack};font-size:22px;font-weight:700;color:${colors.textPrimary};line-height:1.3;">
      Verify Your Email
    </h1>
    <p style="margin:0 0 4px 0;font-family:${fontStack};font-size:15px;line-height:24px;color:${colors.textSecondary};">
      Welcome to cashive.gg! Tap the button below to verify your email address and activate your account.
    </p>
    ${ctaButton(verifyUrl, "Verify Email Address")}
    <p style="margin:0 0 8px 0;font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.textSecondary};">
      This link expires in <strong style="color:${colors.textPrimary};">24 hours</strong>.
    </p>
    <p style="margin:0 0 8px 0;font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.textSecondary};">
      If the button doesn&rsquo;t work, copy and paste this URL into your browser:
    </p>
    <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.accent};word-break:break-all;">
      ${verifyUrl}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding-top:24px;border-top:1px solid ${colors.border};margin-top:24px;">
        <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.textSecondary};">
          If you didn&rsquo;t create an account on cashive.gg, you can safely ignore this email.
        </p>
      </td></tr>
    </table>`;

  return sendEmail({
    to,
    subject: "Verify your Cashive account",
    html: emailLayout(content),
    text: `Welcome to cashive.gg! Verify your email: ${verifyUrl} — This link expires in 24 hours.`,
  });
}

// ---- Template: Password Reset ----

export function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const content = `
    <h1 style="margin:0 0 12px 0;font-family:${fontStack};font-size:22px;font-weight:700;color:${colors.textPrimary};line-height:1.3;">
      Reset Your Password
    </h1>
    <p style="margin:0 0 4px 0;font-family:${fontStack};font-size:15px;line-height:24px;color:${colors.textSecondary};">
      We received a request to reset the password for your cashive.gg account. Tap the button below to choose a new password.
    </p>
    ${ctaButton(resetUrl, "Reset Password")}
    <p style="margin:0 0 8px 0;font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.textSecondary};">
      This link expires in <strong style="color:${colors.textPrimary};">1 hour</strong>.
    </p>
    <p style="margin:0 0 8px 0;font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.textSecondary};">
      If the button doesn&rsquo;t work, copy and paste this URL into your browser:
    </p>
    <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.accent};word-break:break-all;">
      ${resetUrl}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding-top:24px;border-top:1px solid ${colors.border};margin-top:24px;">
        <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.textSecondary};">
          If you didn&rsquo;t request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </td></tr>
    </table>`;

  return sendEmail({
    to,
    subject: "Reset your Cashive password",
    html: emailLayout(content),
    text: `Reset your cashive.gg password: ${resetUrl} — This link expires in 1 hour.`,
  });
}

// ---- Template: Withdrawal Confirmation ----

export function sendWithdrawalConfirmationEmail(
  to: string,
  amount: string,
  method: string
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 12px 0;font-family:${fontStack};font-size:22px;font-weight:700;color:${colors.textPrimary};line-height:1.3;">
      Withdrawal Processed
    </h1>
    <p style="margin:0 0 20px 0;font-family:${fontStack};font-size:15px;line-height:24px;color:${colors.textSecondary};">
      Great news! Your withdrawal has been successfully processed.
    </p>
    <!-- Amount card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background-color:${colors.elevatedBg};border:1px solid ${colors.border};border-radius:8px;padding:20px 24px;text-align:center;">
          <p style="margin:0 0 4px 0;font-family:${fontStack};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${colors.textSecondary};">
            Amount
          </p>
          <p style="margin:0 0 12px 0;font-family:${fontStack};font-size:32px;font-weight:700;color:${colors.success};line-height:1.2;">
            ${amount}
          </p>
          <p style="margin:0;font-family:${fontStack};font-size:13px;color:${colors.textSecondary};">
            via <strong style="color:${colors.textPrimary};">${method}</strong>
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:20px 0 0 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr>
              <td style="width:8px;height:8px;background-color:${colors.success};border-radius:50%;"></td>
              <td style="padding-left:8px;font-family:${fontStack};font-size:13px;font-weight:700;color:${colors.success};">
                Completed
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0 0;font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.textSecondary};">
      Please allow time for the payment to arrive depending on your chosen withdrawal method. If you have any questions, reach out to our support team.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding-top:24px;border-top:1px solid ${colors.border};margin-top:24px;">
        <p style="margin:0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.textSecondary};">
          If you did not initiate this withdrawal, please contact support immediately.
        </p>
      </td></tr>
    </table>`;

  return sendEmail({
    to,
    subject: "Withdrawal confirmed — Cashive",
    html: emailLayout(content),
    text: `Your withdrawal of ${amount} via ${method} has been processed.`,
  });
}
