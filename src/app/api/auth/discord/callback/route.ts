/**
 * GET /api/auth/discord/callback
 *
 * Handles the Discord OAuth callback. Exchanges the authorization code for
 * tokens, fetches the user profile, and creates or links the account.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, getClientIp, getDeviceInfo } from "@/lib/auth";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  discriminator: string;
  global_name?: string;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const loginUrl = `${appUrl}/login`;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors from Discord
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
    const clientId = process.env.DISCORD_CLIENT_ID!;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/discord/callback`;

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
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

    const tokens: DiscordTokenResponse = await tokenRes.json();

    // Fetch user profile
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
    }

    const discordUser: DiscordUser = await userRes.json();

    if (!discordUser.email) {
      return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
    }

    const ip = getClientIp(request);
    const device = getDeviceInfo(request);

    // Build Discord avatar URL
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    // 1. Check if user exists with this discordId
    let user = await db.user.findUnique({
      where: { discordId: discordUser.id },
    });

    if (user) {
      // Existing Discord-linked user — log in
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
      where: { email: discordUser.email.toLowerCase() },
    });

    if (user) {
      // Link Discord account to existing user
      if (user.isBanned) {
        return NextResponse.redirect(`${loginUrl}?error=account_banned`);
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          discordId: discordUser.id,
          emailVerified: true,
          avatarUrl: user.avatarUrl ?? avatarUrl,
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
    // Generate a unique username from Discord username
    const baseUsername = (discordUser.global_name ?? discordUser.username)
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
        email: discordUser.email.toLowerCase(),
        emailVerified: true,
        discordId: discordUser.id,
        username,
        avatarUrl,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    await createSession(user.id, { ip, device });

    const response = NextResponse.redirect(appUrl);
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    console.error("[Discord OAuth] Callback error:", err);
    return NextResponse.redirect(`${loginUrl}?error=oauth_failed`);
  }
}
