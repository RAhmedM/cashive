/**
 * POST /api/user/me/2fa/verify
 *
 * Verify the TOTP code from the authenticator app and finalize 2FA setup.
 * The secret (from /2fa/enable) is sent along with the code for verification.
 */
import * as OTPAuth from "otpauth";
import { db } from "@/lib/db";
import { encrypt2FASecret } from "@/lib/auth";
import { withAuth, jsonOk, jsonError, parseBody } from "@/lib/middleware";
import { z } from "zod";

const verify2FASetupSchema = z.object({
  secret: z.string().min(1, "Secret is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const POST = withAuth(async (request, user) => {
  if (user.totpEnabled) {
    return jsonError("Two-factor authentication is already enabled", 400);
  }

  const { data, error } = await parseBody(request, verify2FASetupSchema);
  if (error) return error;

  const { secret, code } = data;

  // Verify the code against the provided secret
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return jsonError("Invalid verification code. Please try again.", 400);
  }

  // Encrypt the secret and save it
  const encryptedSecret = encrypt2FASecret(secret);

  await db.user.update({
    where: { id: user.id },
    data: {
      totpSecret: encryptedSecret,
      totpEnabled: true,
    },
  });

  return jsonOk({ message: "Two-factor authentication enabled successfully." });
});
