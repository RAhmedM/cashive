/**
 * POST /api/user/me/2fa/enable
 *
 * Start 2FA setup: generate a TOTP secret and return a QR code URL.
 * The secret is NOT saved until the user verifies it via /2fa/verify.
 */
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { withAuth, jsonOk, jsonError } from "@/lib/middleware";

export const POST = withAuth(async (_request, user) => {
  if (user.totpEnabled) {
    return jsonError("Two-factor authentication is already enabled", 400);
  }

  // Generate a new TOTP secret
  const secret = new OTPAuth.Secret({ size: 20 });

  const totp = new OTPAuth.TOTP({
    issuer: "Cashive",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthUrl = totp.toString();

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Return the secret and QR code. The client will show the QR code
  // and ask the user to enter a verification code to confirm setup.
  // We pass the secret as base32 so the verify endpoint can use it.
  return jsonOk({
    secret: secret.base32,
    qrCode: qrCodeDataUrl,
    otpauthUrl,
    message: "Scan the QR code with your authenticator app, then verify with a code.",
  });
});
