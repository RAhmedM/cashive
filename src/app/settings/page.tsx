"use client";

import React from "react";
import AppLayout from "@/components/AppLayout";
import {
  SettingsSection,
  TextInput,
  Toast,
  ToggleSwitch,
} from "@/components/Part3Components";
import { CopyButton, ProgressBar, ProviderAvatar } from "@/components/SharedComponents";
import BeeLoader from "@/components/BeeLoader";
import SurveyProfileModal from "@/components/SurveyProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useMutate } from "@/hooks/useApi";
import { api } from "@/lib/api";
import {
  ChevronRight,
  TriangleAlert,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────

interface Session {
  id: string;
  device: string | null;
  ip: string | null;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

// ─── Static data (no API endpoint) ─────────────────────────────────

const linkedAccounts = [
  { id: "google", name: "Google", image: "/providers/google.png", connected: true },
  { id: "facebook", name: "Facebook", image: "/providers/facebook.png", connected: false },
  { id: "steam", name: "Steam", image: "/providers/steam.png", connected: true },
];

const sections = [
  "Account",
  "Profile",
  "Security",
  "Notifications",
  "Display Preferences",
  "Privacy",
  "Danger Zone",
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { data: sessionsData, loading: sessionsLoading, refetch: refetchSessions } = useApi<{ sessions: Session[] }>("/api/user/me/sessions");
  const { mutate, loading: saving } = useMutate();

  const [activeSection, setActiveSection] = React.useState("Account");
  const [toast, setToast] = React.useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [formInitialized, setFormInitialized] = React.useState(false);
  const [formState, setFormState] = React.useState({
    emailNotifications: true,
    offerNotifications: true,
    referralNotifications: true,
    weeklySummary: true,
    marketingEmails: false,
    raceResults: true,
    offerCredited: true,
    streakReminders: true,
    promoDrops: false,
    chatOpenOnLoad: false,
    publicProfile: true,
    anonymousChat: false,
    anonymousLeaderboard: false,
    pushEnabled: false,
    language: "English",
    balanceDisplay: "both",
    username: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    deleteUsername: "",
    deletePassword: "",
    deleteConfirmed: false,
  });

  // Initialize form state from user data once available
  React.useEffect(() => {
    if (user && !formInitialized) {
      setFormState((prev) => ({
        ...prev,
        language: user.language || "English",
        balanceDisplay: user.balanceDisplay || "both",
        username: user.username || "",
        chatOpenOnLoad: user.chatOpenDefault ?? false,
        publicProfile: user.profilePublic ?? true,
        anonymousChat: user.anonymousInChat ?? false,
        anonymousLeaderboard: user.anonymousOnLeaderboard ?? false,
        // Map notification prefs from user
        emailNotifications: user.notifEmail?.withdrawals !== false,
        offerNotifications: user.notifEmail?.offers !== false,
        referralNotifications: user.notifEmail?.referrals !== false,
        weeklySummary: user.notifEmail?.weeklySummary !== false,
        marketingEmails: user.notifEmail?.marketing === true,
        pushEnabled: user.notifPush?.enabled === true,
        raceResults: user.notifOnsite?.raceResults !== false,
        offerCredited: user.notifOnsite?.offerCredited !== false,
        streakReminders: user.notifOnsite?.streakReminders !== false,
        promoDrops: user.notifOnsite?.promoDrops === true,
      }));
      setFormInitialized(true);
    }
  }, [user, formInitialized]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ type, message });
  };

  // ─── PATCH /api/user/me helper ─────────────────────────────────

  const saveProfile = async (fields: Record<string, unknown>, message = "Saved") => {
    const result = await mutate(() => api.patch("/api/user/me", fields));
    if (result) {
      showToast(message);
      await refreshUser();
    }
  };

  // ─── Password change ──────────────────────────────────────────

  const changePassword = async () => {
    if (!formState.password || !formState.newPassword || !formState.confirmPassword) {
      showToast("Please fill in all password fields", "error");
      return;
    }
    if (formState.newPassword !== formState.confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (formState.newPassword.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }

    const result = await mutate(() =>
      api.patch<{ message: string }>("/api/user/me/password", {
        currentPassword: formState.password,
        newPassword: formState.newPassword,
      })
    );
    if (result) {
      showToast(result.message);
      setFormState((prev) => ({ ...prev, password: "", newPassword: "", confirmPassword: "" }));
    }
  };

  // ─── Session management ────────────────────────────────────────

  const revokeSession = async (sessionId: string) => {
    const result = await mutate(() => api.delete<{ message: string }>(`/api/user/me/sessions?id=${sessionId}`));
    if (result) {
      showToast(result.message);
      await refetchSessions();
    }
  };

  const revokeAllOtherSessions = async () => {
    const result = await mutate(() => api.delete<{ message: string }>("/api/user/me/sessions?all=true"));
    if (result) {
      showToast(result.message);
      await refetchSessions();
    }
  };

  // ─── Notification pref save helper ─────────────────────────────

  const saveNotificationPref = async (
    channel: "email" | "push" | "onsite",
    key: string,
    value: boolean
  ) => {
    await saveProfile(
      { notificationPrefs: { [channel]: { [key]: value } } },
      "Notification preference updated"
    );
  };

  const jumpToSection = (section: string) => {
    setActiveSection(section);
    document.getElementById(`settings-${section.toLowerCase().replace(/\s+/g, "-")}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Format relative time for sessions
  const formatSessionTime = (dateStr: string, isCurrent: boolean) => {
    if (isCurrent) return "Active now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  // Compute password strength
  const getPasswordStrength = (pw: string): { label: string; value: number } => {
    if (!pw) return { label: "None", value: 0 };
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (pw.length >= 12) score += 15;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 20;
    if (/\d/.test(pw)) score += 20;
    if (/[^a-zA-Z0-9]/.test(pw)) score += 20;
    if (score <= 25) return { label: "Weak", value: score };
    if (score <= 50) return { label: "Fair", value: score };
    if (score <= 75) return { label: "Moderate", value: score };
    return { label: "Strong", value: score };
  };

  const passwordStrength = getPasswordStrength(formState.newPassword);

  const sessions = sessionsData?.sessions ?? [];

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <BeeLoader />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {toast ? <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage your account, profile, security, preferences, and privacy.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-border bg-bg-surface p-3 animate-fade-up xl:sticky xl:top-24">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section}
                  type="button"
                    onClick={() => jumpToSection(section)}
                  className={`relative flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all ${activeSection === section ? "bg-accent-gold/10 text-accent-gold" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"}`}
                >
                  {activeSection === section ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-gold" /> : null}
                  <span>{section}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <div id="settings-account" className="scroll-mt-24">
            <SettingsSection title="Account" description="Identity, linked accounts, and how your balance is displayed.">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Email Address</p>
                      <p className="mt-1 text-sm text-text-secondary">{user.email}</p>
                      <p className="mt-1 text-xs text-text-tertiary">Email cannot be changed after verification.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.emailVerified ? "bg-success/10 text-success" : "bg-accent-gold/10 text-accent-gold"}`}>
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </span>
                      {!user.emailVerified ? <button className="rounded-lg border border-accent-gold/20 px-3 py-2 text-xs font-semibold text-accent-gold">Verify Email</button> : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">User ID</p>
                    <p className="text-sm text-text-secondary">{user.id}</p>
                  </div>
                  <CopyButton text={user.id} className="px-3 py-2 text-xs" />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-text-primary">Linked Accounts</p>
                  {linkedAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated/35 p-4">
                      <div className="flex items-center gap-3">
                        <ProviderAvatar name={account.name} image={account.image} size={40} className="rounded-xl" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{account.name}</p>
                          <span className={`text-xs font-semibold ${account.connected ? "text-success" : "text-text-tertiary"}`}>
                            {account.connected ? "Connected" : "Not Connected"}
                          </span>
                        </div>
                      </div>
                      <button className="rounded-lg border border-accent-gold/20 px-3 py-2 text-xs font-semibold text-accent-gold">
                        {account.connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <p className="text-sm font-medium text-text-primary mb-3">Currency Display</p>
                  <div className="inline-flex rounded-xl border border-border bg-bg-deepest p-1">
                    {[
                      { label: "Honey", value: "honey" },
                      { label: "USD", value: "usd" },
                      { label: "Both", value: "both" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormState((prev) => ({ ...prev, balanceDisplay: option.value }));
                          saveProfile({ balanceDisplay: option.value }, "Balance display updated");
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${formState.balanceDisplay === option.value ? "bg-accent-gold text-bg-deepest" : "text-text-secondary hover:text-text-primary"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SettingsSection>
            </div>

            <div id="settings-profile" className="scroll-mt-24">
            <SettingsSection title="Profile" description="Avatar, username, and survey profile details.">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-elevated/35 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-gold/10 text-xl font-bold text-accent-gold">
                      {user.username?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">Avatar</p>
                      <p className="text-xs text-text-tertiary">Upload a custom avatar or use a bee-themed default.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deepest">Change Avatar</button>
                    <button className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary">Remove</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <TextInput label="Username" value={formState.username} onChange={(value) => setFormState((prev) => ({ ...prev, username: value }))} />
                  <p className="-mt-1 text-xs text-text-tertiary">Username can be changed once every 30 days.</p>
                  {formState.username !== user.username && formState.username.length >= 3 && (
                    <button
                      onClick={() => saveProfile({ username: formState.username }, "Username updated")}
                      disabled={saving}
                      className="rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deepest disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Username"}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Survey Profile</p>
                      <p className="text-xs text-text-tertiary">Complete this to improve survey matching and payouts.</p>
                    </div>
                    <button
                      onClick={() => setProfileModalOpen(true)}
                      className="rounded-lg border border-accent-gold/20 px-3 py-2 text-xs font-semibold text-accent-gold"
                    >
                      Complete Profile
                    </button>
                  </div>
                  <ProgressBar value={user.stats.surveyProfileCompletion} max={100} showLabel />
                </div>
              </div>
            </SettingsSection>
            </div>

            <div id="settings-security" className="scroll-mt-24">
            <SettingsSection title="Security" description="Password, sessions, 2FA, and identity verification.">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <TextInput label="Current Password" type="password" value={formState.password} onChange={(value) => setFormState((prev) => ({ ...prev, password: value }))} />
                  <TextInput label="New Password" type="password" value={formState.newPassword} onChange={(value) => setFormState((prev) => ({ ...prev, newPassword: value }))} />
                  <TextInput label="Confirm Password" type="password" value={formState.confirmPassword} onChange={(value) => setFormState((prev) => ({ ...prev, confirmPassword: value }))} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-xl border border-border bg-bg-elevated/35 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">Password Strength</p>
                      <span className="text-xs text-text-tertiary">{passwordStrength.label}</span>
                    </div>
                    <ProgressBar value={passwordStrength.value} max={100} color="from-accent-gold to-success" />
                  </div>
                  <button
                    onClick={changePassword}
                    disabled={saving || !formState.password || !formState.newPassword || !formState.confirmPassword}
                    className="rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-deepest disabled:opacity-50"
                  >
                    {saving ? "Changing..." : "Change Password"}
                  </button>
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
                    <p className="text-xs text-text-tertiary">
                      {user.twoFactorEnabled ? "Enabled. Your account is protected with 2FA." : "Disabled. Protect withdrawals and account access."}
                    </p>
                  </div>
                  <button className="rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deepest">
                    {user.twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">Active Sessions</p>
                    <button
                      onClick={revokeAllOtherSessions}
                      disabled={saving}
                      className="rounded-lg border border-danger/20 px-3 py-2 text-xs font-semibold text-danger disabled:opacity-50"
                    >
                      Revoke All Other Sessions
                    </button>
                  </div>
                  {sessionsLoading ? (
                    <div className="flex justify-center py-4">
                      <BeeLoader />
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-text-tertiary py-4 text-center">No active sessions found.</p>
                  ) : (
                    sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated/35 p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary">{session.device || "Unknown Device"}</p>
                            {session.isCurrent && (
                              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Current</span>
                            )}
                          </div>
                          <p className="text-xs text-text-tertiary">
                            {session.ip || "Unknown IP"} {" "} {formatSessionTime(session.lastActive, session.isCurrent)}
                          </p>
                        </div>
                        {!session.isCurrent && (
                          <button
                            onClick={() => revokeSession(session.id)}
                            disabled={saving}
                            className="rounded-lg border border-danger/20 px-3 py-2 text-xs font-semibold text-danger disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Identity Verification (KYC)</p>
                    <p className="text-xs text-text-tertiary">Required for your first withdrawal.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent-gold/10 px-2.5 py-1 text-xs font-semibold text-accent-gold capitalize">{user.kycStatus || "Not Started"}</span>
                    <button className="rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deepest">Verify Identity</button>
                  </div>
                </div>
              </div>
            </SettingsSection>
            </div>

            <div id="settings-notifications" className="scroll-mt-24">
            <SettingsSection title="Notifications" description="Choose how Cashive keeps you updated.">
              <div className="space-y-3">
                <ToggleSwitch label="Withdrawal confirmations" value={formState.emailNotifications} onChange={(value) => { setFormState((prev) => ({ ...prev, emailNotifications: value })); saveNotificationPref("email", "withdrawals", value); }} />
                <ToggleSwitch label="New high-value offers" value={formState.offerNotifications} onChange={(value) => { setFormState((prev) => ({ ...prev, offerNotifications: value })); saveNotificationPref("email", "offers", value); }} />
                <ToggleSwitch label="Referral activity" value={formState.referralNotifications} onChange={(value) => { setFormState((prev) => ({ ...prev, referralNotifications: value })); saveNotificationPref("email", "referrals", value); }} />
                <ToggleSwitch label="Weekly earnings summary" value={formState.weeklySummary} onChange={(value) => { setFormState((prev) => ({ ...prev, weeklySummary: value })); saveNotificationPref("email", "weeklySummary", value); }} />
                <ToggleSwitch label="Marketing / promotional emails" value={formState.marketingEmails} onChange={(value) => { setFormState((prev) => ({ ...prev, marketingEmails: value })); saveNotificationPref("email", "marketing", value); }} />
                <ToggleSwitch label="Push notifications" description="Enable push notifications in your browser." value={formState.pushEnabled} onChange={(value) => { setFormState((prev) => ({ ...prev, pushEnabled: value })); saveNotificationPref("push", "enabled", value); }} />
                <ToggleSwitch label="Race results" value={formState.raceResults} onChange={(value) => { setFormState((prev) => ({ ...prev, raceResults: value })); saveNotificationPref("onsite", "raceResults", value); }} />
                <ToggleSwitch label="Offer credited" value={formState.offerCredited} onChange={(value) => { setFormState((prev) => ({ ...prev, offerCredited: value })); saveNotificationPref("onsite", "offerCredited", value); }} />
                <ToggleSwitch label="Streak reminders" value={formState.streakReminders} onChange={(value) => { setFormState((prev) => ({ ...prev, streakReminders: value })); saveNotificationPref("onsite", "streakReminders", value); }} />
                <ToggleSwitch label="Promo code drops" value={formState.promoDrops} onChange={(value) => { setFormState((prev) => ({ ...prev, promoDrops: value })); saveNotificationPref("onsite", "promoDrops", value); }} />
              </div>
            </SettingsSection>
            </div>

            <div id="settings-display-preferences" className="scroll-mt-24">
            <SettingsSection title="Display Preferences" description="Interface preferences for balance, chat, and language.">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <p className="mb-3 text-sm font-medium text-text-primary">Balance Display</p>
                  <div className="inline-flex rounded-xl border border-border bg-bg-deepest p-1">
                    {[
                      { label: "Honey", value: "honey" },
                      { label: "USD", value: "usd" },
                      { label: "Both", value: "both" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormState((prev) => ({ ...prev, balanceDisplay: option.value }));
                          saveProfile({ balanceDisplay: option.value }, "Balance display updated");
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${formState.balanceDisplay === option.value ? "bg-accent-gold text-bg-deepest" : "text-text-secondary hover:text-text-primary"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ToggleSwitch label="Open chat panel on page load" value={formState.chatOpenOnLoad} onChange={(value) => { setFormState((prev) => ({ ...prev, chatOpenOnLoad: value })); saveProfile({ chatOpenDefault: value }); }} />
                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <label className="mb-2 block text-sm font-medium text-text-primary">Language</label>
                  <select
                    value={formState.language}
                    onChange={(e) => {
                      const lang = e.target.value;
                      setFormState((prev) => ({ ...prev, language: lang }));
                      saveProfile({ language: lang }, "Language updated");
                    }}
                    className="w-full rounded-xl border border-border bg-bg-deepest px-4 py-3 text-sm text-text-primary outline-none focus:border-accent-gold"
                  >
                    {["English", "Spanish", "French", "German", "Portuguese"].map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-text-tertiary">This changes the site interface language. Survey availability depends on your region.</p>
                </div>
              </div>
            </SettingsSection>
            </div>

            <div id="settings-privacy" className="scroll-mt-24">
            <SettingsSection title="Privacy" description="Control how visible you are across the platform.">
              <div className="space-y-3">
                <ToggleSwitch label="Show my profile publicly" value={formState.publicProfile} onChange={(value) => { setFormState((prev) => ({ ...prev, publicProfile: value })); saveProfile({ profilePublic: value }); }} />
                <ToggleSwitch label="Show as Anonymous in chat" value={formState.anonymousChat} onChange={(value) => { setFormState((prev) => ({ ...prev, anonymousChat: value })); saveProfile({ anonymousInChat: value }); }} />
                <ToggleSwitch label="Show as Anonymous on leaderboards" value={formState.anonymousLeaderboard} onChange={(value) => { setFormState((prev) => ({ ...prev, anonymousLeaderboard: value })); saveProfile({ anonymousOnLeaderboard: value }); }} />
                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Data Export</p>
                    <p className="text-xs text-text-tertiary">This includes your earnings history, profile data, and activity log. Processing may take a few minutes.</p>
                  </div>
                  <button className="rounded-lg border border-accent-gold/20 px-3 py-2 text-xs font-semibold text-accent-gold">Download My Data</button>
                </div>
              </div>
            </SettingsSection>
            </div>

            <div id="settings-danger-zone" className="scroll-mt-24">
            <SettingsSection title="Danger Zone" description="Destructive actions that affect your account access and stored data." danger>
              <div className="space-y-4">
                <div className="rounded-xl border border-danger/15 bg-danger/5 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Disable Account</p>
                    <p className="text-xs text-text-tertiary">Disable your account temporarily. You can reactivate by logging in again.</p>
                  </div>
                  <button className="rounded-lg border border-danger/20 px-4 py-2 text-sm font-semibold text-danger">Disable Account</button>
                </div>
                <div className="rounded-xl border border-danger/15 bg-danger/5 p-4">
                  <div className="mb-4 flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 w-5 h-5 text-danger" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">Delete Account</p>
                      <p className="text-xs text-text-tertiary">Permanently delete your account and all associated data. This action cannot be undone.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextInput label="Type your username to confirm" value={formState.deleteUsername} onChange={(value) => setFormState((prev) => ({ ...prev, deleteUsername: value }))} />
                    <TextInput label="Enter your password" type="password" value={formState.deletePassword} onChange={(value) => setFormState((prev) => ({ ...prev, deletePassword: value }))} />
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={formState.deleteConfirmed}
                      onChange={(e) => setFormState((prev) => ({ ...prev, deleteConfirmed: e.target.checked }))}
                      className="h-4 w-4 rounded border-border bg-bg-deepest text-danger"
                    />
                    I understand this is irreversible.
                  </label>
                  <div className="mt-4 flex justify-end">
                    <button
                      disabled={!formState.deleteConfirmed || formState.deleteUsername !== user.username || !formState.deletePassword}
                      className="rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              </div>
            </SettingsSection>
            </div>
          </div>
        </div>
      </div>

      {/* Survey profile modal */}
      <SurveyProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSaved={() => {
          refreshUser();
          showToast("Survey profile updated", "success");
        }}
      />
    </AppLayout>
  );
}
