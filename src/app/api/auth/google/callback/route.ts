/**
 * GET /api/auth/google/callback
 *
 * Handles the Google OAuth callback. Exchanges the authorization code for
 * tokens, fetches the user profile, and creates or links the account.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, getClientIp, getDeviceInfo } from "@/lib/auth";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const loginUrl = `${appUrl}/login`;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors from Google
    if (error) {
      return NextResponse.redirect(`${loginUrl}?error=oauth_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
    }

    // Validate state parameter against cookie
    const storedState = request.cookies.get("oauth_state")?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
    }

    const tokens: GoogleTokenResponse = await tokenRes.json();

    // Fetch user profile
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoRes.ok) {
      return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
    }

    const googleUser: GoogleUserInfo = await userInfoRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
    }

    const ip = getClientIp(request);
    const device = getDeviceInfo(request);

    // 1. Check if user exists with this googleId
    let user = await db.user.findUnique({
      where: { googleId: googleUser.sub },
    });

    if (user) {
      // Existing Google-linked user — log in
      if (user.isBanned) {
        return NextResponse.redirect(`${loginUrl}?error=account_banned`);
      }

      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastLoginIp: ip },
      });

      await createSession(user.id, { ip, device });

      const response = NextResponse.redirect(appUrl);
      response.cookies.delete("oauth_state");
      return response;
    }

    // 2. Check if user exists with matching email
    user = await db.user.findUnique({
      where: { email: googleUser.email.toLowerCase() },
    });

    if (user) {
      // Link Google account to existing user
      if (user.isBanned) {
        return NextResponse.redirect(`${loginUrl}?error=account_banned`);
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.sub,
          emailVerified: true,
          avatarUrl: user.avatarUrl ?? googleUser.picture ?? null,
          lastLoginAt: new Date(),
          lastLoginIp: ip,
        },
      });

      await createSession(user.id, { ip, device });

      const response = NextResponse.redirect(appUrl);
      response.cookies.delete("oauth_state");
      return response;
    }

    // 3. New user — create account
    // Generate a unique username from Google name or email
    const baseUsername = (
      googleUser.given_name ??
      googleUser.email.split("@")[0]
    )
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 15);

    let username = baseUsername;
    let suffix = 1;
    while (await db.user.findUnique({ where: { username } })) {
      username = `${baseUsername.slice(0, 15)}${suffix}`;
      suffix++;
    }

    user = await db.user.create({
      data: {
        email: googleUser.email.toLowerCase(),
        emailVerified: true,
        googleId: googleUser.sub,
        username,
        avatarUrl: googleUser.picture ?? null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    await createSession(user.id, { ip, device });

    const response = NextResponse.redirect(appUrl);
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    console.error("[Google OAuth] Callback error:", err);
    return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
  }
}
