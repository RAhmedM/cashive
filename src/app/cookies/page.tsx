import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | Cashive",
  description: "Cookie Policy for Cashive.gg rewards platform.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-bg-deepest">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 lg:px-8">
        <header className="mb-12">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-accent-gold transition-colors"
          >
            &larr; Back to Cashive
          </Link>
          <h1 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
            Cookie Policy
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">Last updated: March 2026</p>
        </header>

        <div className="space-y-10 text-sm leading-7 text-text-secondary">
          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">1. What Are Cookies</h2>
            <p>
              Cookies are small text files that are stored on your device when you visit a website. They are widely
              used to make websites work more efficiently, provide a better user experience, and supply information
              to website operators. Cookies can be &quot;session&quot; cookies (deleted when you close your browser) or
              &quot;persistent&quot; cookies (remaining on your device until they expire or you delete them).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">2. Cookies We Use</h2>
            <p>We use the following categories of cookies on the Platform:</p>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-bg-surface p-4">
                <h3 className="mb-1.5 text-sm font-semibold text-text-primary">Essential Cookies</h3>
                <p className="text-xs leading-6 text-text-secondary">
                  These cookies are strictly necessary for the Platform to function. They include session cookies that
                  maintain your login state, CSRF protection tokens, and cookies that remember your consent preferences.
                  Without these cookies, the Platform cannot operate properly. These cookies cannot be disabled.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-bg-surface p-4">
                <h3 className="mb-1.5 text-sm font-semibold text-text-primary">Analytics Cookies</h3>
                <p className="text-xs leading-6 text-text-secondary">
                  We use analytics cookies to understand how visitors interact with the Platform. These cookies collect
                  information such as pages visited, time spent on pages, and navigation patterns. This data is
                  aggregated and anonymized to help us improve the Platform&apos;s performance and user experience.
                  Analytics tools we may use include privacy-focused alternatives that do not track individual users
                  across sites.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-bg-surface p-4">
                <h3 className="mb-1.5 text-sm font-semibold text-text-primary">Offerwall Tracking Cookies</h3>
                <p className="text-xs leading-6 text-text-secondary">
                  When you interact with third-party offerwalls and survey providers on the Platform, they may set
                  cookies on your device to track offer completions and attribute earnings to your account. These
                  cookies are essential for the earning functionality of the Platform and ensure you receive proper
                  credit for completed offers. Each offerwall provider has their own cookie practices as described in
                  their respective privacy policies.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">3. Managing Cookies</h2>
            <p>
              Most web browsers allow you to manage cookies through their settings. You can typically configure your
              browser to block all cookies, accept all cookies, or notify you when a cookie is set. Please note
              that blocking essential cookies will prevent the Platform from functioning correctly and you may not
              be able to log in or use core features.
            </p>
            <p className="mt-3">
              To manage cookies in your browser, consult your browser&apos;s help documentation. Common browsers include:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Chrome: Settings &gt; Privacy and Security &gt; Cookies and other site data</li>
              <li>Firefox: Settings &gt; Privacy &amp; Security &gt; Cookies and Site Data</li>
              <li>Safari: Preferences &gt; Privacy &gt; Manage Website Data</li>
              <li>Edge: Settings &gt; Cookies and site permissions &gt; Cookies and site data</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">4. Third-Party Cookies</h2>
            <p>
              In addition to our own cookies, third-party services integrated into the Platform may set their own
              cookies. These include offerwall providers, survey platforms, and payment processors. We do not control
              the cookies set by these third parties and their use is governed by the respective third party&apos;s privacy
              and cookie policies. We recommend reviewing the cookie policies of any third-party services you interact
              with through the Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">5. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other
              operational, legal, or regulatory reasons. We will post the updated policy on this page with a revised
              &quot;Last updated&quot; date. Your continued use of the Platform after changes are posted constitutes your
              acceptance of the updated Cookie Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">6. Contact Information</h2>
            <p>
              If you have questions about our use of cookies or this Cookie Policy, please contact us at{" "}
              <a href="mailto:privacy@cashive.gg" className="text-accent-gold hover:underline">
                privacy@cashive.gg
              </a>{" "}
              or through the support widget on the Platform.
            </p>
          </section>
        </div>

        <footer className="mt-16 border-t border-border pt-6 text-xs text-text-tertiary">
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-accent-gold transition-colors">Privacy Policy</Link>
            <Link href="/cookies" className="text-accent-gold">Cookie Policy</Link>
            <Link href="/terms" className="hover:text-accent-gold transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
