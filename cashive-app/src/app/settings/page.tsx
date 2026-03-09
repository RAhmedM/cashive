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
import { activeSessions, currentUser, linkedAccounts } from "@/data/mockData";
import {
  Check,
  ChevronRight,
  CircleAlert,
  Shield,
  UserCircle,
  Bell,
  Monitor,
  Eye,
  TriangleAlert,
} from "lucide-react";

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
  const [activeSection, setActiveSection] = React.useState("Account");
  const [toast, setToast] = React.useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
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
    showTickerInChat: true,
    publicProfile: true,
    anonymousChat: false,
    anonymousLeaderboard: false,
    pushEnabled: false,
    language: currentUser.language,
    balanceDisplay: currentUser.balanceDisplay,
    username: currentUser.username,
    password: "",
    newPassword: "",
    confirmPassword: "",
  });

  const save = (message = "Saved") => setToast({ type: "success", message });

  return (
    <AppLayout>
      {toast ? <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage your account, profile, security, preferences, and privacy.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-border bg-bg-surface p-3 xl:sticky xl:top-24">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
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
            <SettingsSection title="Account" description="Identity, linked accounts, and how your balance is displayed.">
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Email Address</p>
                      <p className="mt-1 text-sm text-text-secondary">{currentUser.email}</p>
                      <p className="mt-1 text-xs text-text-tertiary">Email cannot be changed after verification.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${currentUser.emailVerified ? "bg-success/10 text-success" : "bg-accent-gold/10 text-accent-gold"}`}>
                        {currentUser.emailVerified ? "Verified" : "Unverified"}
                      </span>
                      {!currentUser.emailVerified ? <button className="rounded-lg border border-accent-gold/20 px-3 py-2 text-xs font-semibold text-accent-gold">Verify Email</button> : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">User ID</p>
                    <p className="text-sm text-text-secondary">{currentUser.userId}</p>
                  </div>
                  <CopyButton text={currentUser.userId} className="px-3 py-2 text-xs" />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-text-primary">Linked Accounts</p>
                  {linkedAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated/35 p-4">
                      <div className="flex items-center gap-3">
                        <ProviderAvatar name={account.name} size={40} className="rounded-xl" />
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
                          setFormState((prev) => ({ ...prev, balanceDisplay: option.value as typeof prev.balanceDisplay }));
                          save("Balance display updated");
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

            <SettingsSection title="Profile" description="Avatar, username, and survey profile details.">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-elevated/35 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-gold/10 text-xl font-bold text-accent-gold">{currentUser.initials}</div>
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

                <TextInput label="Username" value={formState.username} onChange={(value) => setFormState((prev) => ({ ...prev, username: value }))} />
                <p className="-mt-2 text-xs text-text-tertiary">Username can be changed once every 30 days.</p>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Survey Profile</p>
                      <p className="text-xs text-text-tertiary">Complete this to improve survey matching and payouts.</p>
                    </div>
                    <button className="rounded-lg border border-accent-gold/20 px-3 py-2 text-xs font-semibold text-accent-gold">Complete Profile</button>
                  </div>
                  <ProgressBar value={currentUser.surveyProfileCompletion} max={100} showLabel />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Security" description="Password, sessions, 2FA, and identity verification.">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <TextInput label="Current Password" type="password" value={formState.password} onChange={(value) => setFormState((prev) => ({ ...prev, password: value }))} />
                  <TextInput label="New Password" type="password" value={formState.newPassword} onChange={(value) => setFormState((prev) => ({ ...prev, newPassword: value }))} />
                  <TextInput label="Confirm Password" type="password" value={formState.confirmPassword} onChange={(value) => setFormState((prev) => ({ ...prev, confirmPassword: value }))} />
                </div>
                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">Password Strength</p>
                    <span className="text-xs text-text-tertiary">Moderate</span>
                  </div>
                  <ProgressBar value={60} max={100} color="from-accent-gold to-success" />
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
                    <p className="text-xs text-text-tertiary">Disabled. Protect withdrawals and account access.</p>
                  </div>
                  <button className="rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deepest">Enable 2FA</button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">Active Sessions</p>
                    <button className="rounded-lg border border-danger/20 px-3 py-2 text-xs font-semibold text-danger">Revoke All Other Sessions</button>
                  </div>
                  {activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated/35 p-4">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{session.device}</p>
                        <p className="text-xs text-text-tertiary">{session.ip} • {session.lastActive}</p>
                      </div>
                      <button className="rounded-lg border border-danger/20 px-3 py-2 text-xs font-semibold text-danger">Revoke</button>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Identity Verification (KYC)</p>
                    <p className="text-xs text-text-tertiary">Required for your first withdrawal.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent-gold/10 px-2.5 py-1 text-xs font-semibold text-accent-gold capitalize">{currentUser.kycStatus}</span>
                    <button className="rounded-lg bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-deepest">Verify Identity</button>
                  </div>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Notifications" description="Choose how Cashive keeps you updated.">
              <div className="space-y-3">
                <ToggleSwitch label="Withdrawal confirmations" value={formState.emailNotifications} onChange={(value) => { setFormState((prev) => ({ ...prev, emailNotifications: value })); save(); }} />
                <ToggleSwitch label="New high-value offers" value={formState.offerNotifications} onChange={(value) => { setFormState((prev) => ({ ...prev, offerNotifications: value })); save(); }} />
                <ToggleSwitch label="Referral activity" value={formState.referralNotifications} onChange={(value) => { setFormState((prev) => ({ ...prev, referralNotifications: value })); save(); }} />
                <ToggleSwitch label="Weekly earnings summary" value={formState.weeklySummary} onChange={(value) => { setFormState((prev) => ({ ...prev, weeklySummary: value })); save(); }} />
                <ToggleSwitch label="Marketing / promotional emails" value={formState.marketingEmails} onChange={(value) => { setFormState((prev) => ({ ...prev, marketingEmails: value })); save(); }} />
                <ToggleSwitch label="Push notifications" description="Enable push notifications in your browser." value={formState.pushEnabled} onChange={(value) => { setFormState((prev) => ({ ...prev, pushEnabled: value })); save("Push preference updated"); }} />
                <ToggleSwitch label="Race results" value={formState.raceResults} onChange={(value) => { setFormState((prev) => ({ ...prev, raceResults: value })); save(); }} />
                <ToggleSwitch label="Offer credited" value={formState.offerCredited} onChange={(value) => { setFormState((prev) => ({ ...prev, offerCredited: value })); save(); }} />
                <ToggleSwitch label="Streak reminders" value={formState.streakReminders} onChange={(value) => { setFormState((prev) => ({ ...prev, streakReminders: value })); save(); }} />
                <ToggleSwitch label="Promo code drops" value={formState.promoDrops} onChange={(value) => { setFormState((prev) => ({ ...prev, promoDrops: value })); save(); }} />
              </div>
            </SettingsSection>

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
                          setFormState((prev) => ({ ...prev, balanceDisplay: option.value as typeof prev.balanceDisplay }));
                          save("Balance display updated");
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${formState.balanceDisplay === option.value ? "bg-accent-gold text-bg-deepest" : "text-text-secondary hover:text-text-primary"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ToggleSwitch label="Open chat panel on page load" value={formState.chatOpenOnLoad} onChange={(value) => { setFormState((prev) => ({ ...prev, chatOpenOnLoad: value })); save(); }} />
                <ToggleSwitch label="Show live activity ticker in chat" value={formState.showTickerInChat} onChange={(value) => { setFormState((prev) => ({ ...prev, showTickerInChat: value })); save(); }} />
                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4">
                  <label className="mb-2 block text-sm font-medium text-text-primary">Language</label>
                  <select
                    value={formState.language}
                    onChange={(e) => {
                      setFormState((prev) => ({ ...prev, language: e.target.value }));
                      save("Language updated");
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

            <SettingsSection title="Privacy" description="Control how visible you are across the platform.">
              <div className="space-y-3">
                <ToggleSwitch label="Show my profile publicly" value={formState.publicProfile} onChange={(value) => { setFormState((prev) => ({ ...prev, publicProfile: value })); save(); }} />
                <ToggleSwitch label="Show as Anonymous in chat" value={formState.anonymousChat} onChange={(value) => { setFormState((prev) => ({ ...prev, anonymousChat: value })); save(); }} />
                <ToggleSwitch label="Show as Anonymous on leaderboards" value={formState.anonymousLeaderboard} onChange={(value) => { setFormState((prev) => ({ ...prev, anonymousLeaderboard: value })); save(); }} />
                <div className="rounded-xl border border-border bg-bg-elevated/35 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Data Export</p>
                    <p className="text-xs text-text-tertiary">This includes your earnings history, profile data, and activity log. Processing may take a few minutes.</p>
                  </div>
                  <button className="rounded-lg border border-accent-gold/20 px-3 py-2 text-xs font-semibold text-accent-gold">Download My Data</button>
                </div>
              </div>
            </SettingsSection>

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
                    <TextInput label="Type your username to confirm" value={formState.username} onChange={(value) => setFormState((prev) => ({ ...prev, username: value }))} />
                    <TextInput label="Enter your password" type="password" value={formState.password} onChange={(value) => setFormState((prev) => ({ ...prev, password: value }))} />
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
                    <input type="checkbox" className="h-4 w-4 rounded border-border bg-bg-deepest text-danger" />
                    I understand this is irreversible.
                  </label>
                  <div className="mt-4 flex justify-end">
                    <button className="rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white">Confirm Delete</button>
                  </div>
                </div>
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
