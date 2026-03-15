import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Cashive",
  description: "Privacy Policy for Cashive.gg rewards platform.",
};

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">Last updated: March 2026</p>
        </header>

        <div className="space-y-10 text-sm leading-7 text-text-secondary">
          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">1. Information We Collect</h2>
            <p>We collect information that you provide directly and information collected automatically:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-text-primary">Account information:</strong> Email address, username, password, and optional profile details such as country and language preference.
              </li>
              <li>
                <strong className="text-text-primary">Identity verification:</strong> When you verify your identity for withdrawals, we collect government-issued ID images and selfie photos.
              </li>
              <li>
                <strong className="text-text-primary">Transaction data:</strong> Honey earnings, withdrawal history, offer completions, and payment method details (e.g., PayPal email, crypto wallet addresses).
              </li>
              <li>
                <strong className="text-text-primary">Device and usage data:</strong> IP address, browser type, device fingerprint, screen resolution, timezone, referring URLs, and pages visited.
              </li>
              <li>
                <strong className="text-text-primary">Communications:</strong> Support ticket messages, chat messages, and any correspondence you send us.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">2. How We Use Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Provide, maintain, and improve the Platform and its features</li>
              <li>Process transactions, earnings, and withdrawal requests</li>
              <li>Verify your identity and prevent fraud, abuse, and multi-accounting</li>
              <li>Communicate with you about your account, support requests, and Platform updates</li>
              <li>Personalize your experience including offerwall availability based on your region</li>
              <li>Enforce our Terms of Service and protect the rights and safety of all users</li>
              <li>Generate aggregated, anonymized analytics to improve Platform performance</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">3. Cookies &amp; Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to maintain your session, remember your preferences,
              and collect analytics data. Essential cookies are required for the Platform to function properly.
              Analytics cookies help us understand usage patterns. Offerwall tracking cookies are used by our
              third-party partners to attribute offer completions to your account. For more details, see our{" "}
              <Link href="/cookies" className="text-accent-gold hover:underline">Cookie Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">4. Third-Party Offerwalls</h2>
            <p>
              The Platform integrates with third-party offerwall and survey providers. When you interact with these
              providers, they may collect information about you according to their own privacy policies. We share
              limited information with these providers (such as a user identifier and country) to facilitate offer
              tracking and crediting. We encourage you to review the privacy policies of any third-party offerwall
              you interact with. We are not responsible for the privacy practices of these third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">5. Data Sharing</h2>
            <p>We do not sell your personal information. We may share your information with:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-text-primary">Service providers:</strong> Third-party services that help us operate the Platform (hosting, payment processing, analytics).
              </li>
              <li>
                <strong className="text-text-primary">Offerwall partners:</strong> Limited identifiers necessary for offer tracking and crediting.
              </li>
              <li>
                <strong className="text-text-primary">Legal requirements:</strong> When required by law, regulation, legal process, or governmental request.
              </li>
              <li>
                <strong className="text-text-primary">Safety and enforcement:</strong> To protect the rights, property, or safety of Cashive, our users, or the public.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide you
              services. Transaction records and withdrawal history are retained for a minimum of 7 years for
              financial compliance purposes. Identity verification documents are deleted within 90 days of
              successful verification. If you delete your account, we will remove your personal information within
              30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud
              prevention).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict the processing of your information</li>
              <li>Request portability of your data in a machine-readable format</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:privacy@cashive.gg" className="text-accent-gold hover:underline">privacy@cashive.gg</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">8. Children&apos;s Privacy</h2>
            <p>
              The Platform is not intended for children under 13 years of age. We do not knowingly collect personal
              information from children under 13. If we become aware that a child under 13 has provided us with
              personal information, we will take steps to delete such information promptly. If you are a parent or
              guardian and believe your child has provided us with personal information, please contact us
              immediately.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting
              a notice on the Platform or sending you an email. Your continued use of the Platform after the changes
              take effect constitutes your acceptance of the revised policy. We encourage you to review this page
              periodically for the latest information on our privacy practices.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">10. Contact Information</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us
              at{" "}
              <a href="mailto:privacy@cashive.gg" className="text-accent-gold hover:underline">
                privacy@cashive.gg
              </a>{" "}
              or through the support widget on the Platform.
            </p>
          </section>
        </div>

        <footer className="mt-16 border-t border-border pt-6 text-xs text-text-tertiary">
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-accent-gold">Privacy Policy</Link>
            <Link href="/cookies" className="hover:text-accent-gold transition-colors">Cookie Policy</Link>
            <Link href="/terms" className="hover:text-accent-gold transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
