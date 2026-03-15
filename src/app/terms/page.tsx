import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Cashive",
  description: "Terms of Service for Cashive.gg rewards platform.",
};

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">Last updated: March 2026</p>
        </header>

        <div className="space-y-10 text-sm leading-7 text-text-secondary">
          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Cashive.gg (the &quot;Platform&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to all of these Terms, you may not access or use the Platform. We
              reserve the right to modify these Terms at any time, and your continued use of the Platform after any
              changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">2. Eligibility</h2>
            <p>
              You must be at least 13 years of age to use the Platform. If you are under 18, you represent that you
              have obtained parental or guardian consent to use the Platform. By creating an account, you represent and
              warrant that all registration information you provide is truthful, accurate, and complete. Cashive
              reserves the right to refuse service, terminate accounts, or remove content at its sole discretion.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">3. Account Registration</h2>
            <p>
              To use certain features of the Platform, you must create an account. You are responsible for maintaining
              the confidentiality of your account credentials and for all activity that occurs under your account. You
              agree to notify us immediately of any unauthorized use of your account. You may not create multiple
              accounts, share your account with others, or transfer your account to any third party.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">4. Honey Currency &amp; Earnings</h2>
            <p>
              &quot;Honey&quot; is the virtual currency used on the Platform. You can earn Honey by completing offers, surveys,
              watching content, referrals, and other activities made available through the Platform. Honey has no
              real-world monetary value outside the Platform and cannot be purchased. Honey balances are non-transferable
              between accounts. We reserve the right to adjust Honey exchange rates, earning rates, and reward
              structures at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">5. Withdrawal Terms</h2>
            <p>
              You may redeem your Honey balance for real-world value through supported withdrawal methods (PayPal,
              cryptocurrency, gift cards, etc.) subject to minimum balance requirements, daily limits, and identity
              verification. Withdrawals are subject to review and may be delayed or denied if we detect suspicious
              activity, policy violations, or incomplete verification. Processing times vary by method and are
              estimates, not guarantees. Fees may apply to certain withdrawal methods as disclosed at the time of
              request.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">6. Prohibited Activities</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Use VPNs, proxies, or other tools to mask your identity or location while completing offers</li>
              <li>Create multiple accounts or use automated tools, bots, or scripts</li>
              <li>Manipulate or fraudulently complete offers, surveys, or other earning activities</li>
              <li>Engage in chargebacks or dispute legitimate transactions</li>
              <li>Abuse referral systems through self-referrals or fraudulent referral activity</li>
              <li>Harass, abuse, or threaten other users or staff in chat or support channels</li>
              <li>Attempt to reverse-engineer, exploit, or compromise the Platform&apos;s security</li>
              <li>Violate any applicable local, state, national, or international law</li>
            </ul>
            <p className="mt-3">
              Violation of these rules may result in account suspension, forfeiture of earnings, and permanent bans.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">7. Intellectual Property</h2>
            <p>
              All content, trademarks, logos, and intellectual property displayed on the Platform are the property of
              Cashive or its licensors. You may not copy, reproduce, distribute, or create derivative works from any
              Platform content without prior written consent. User-generated content (such as chat messages) remains
              your property, but you grant Cashive a non-exclusive, royalty-free license to display, distribute, and
              moderate such content on the Platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">8. Termination</h2>
            <p>
              We may suspend or terminate your account at any time, with or without cause, and with or without notice.
              Upon termination, your right to use the Platform ceases immediately. Any pending withdrawals may be
              cancelled, and your Honey balance may be forfeited if the termination is due to a violation of these
              Terms. You may close your account at any time by contacting support, subject to completion of any pending
              transactions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">9. Limitation of Liability</h2>
            <p>
              The Platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or
              implied. To the fullest extent permitted by law, Cashive shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of profits, data, or goodwill arising out of or
              related to your use of the Platform. Our total liability for any claim arising from your use of the
              Platform shall not exceed the amount you have withdrawn from the Platform in the preceding 12 months.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">10. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
              United States, without regard to its conflict of law provisions. Any disputes arising under these Terms
              shall be resolved through binding arbitration in accordance with the rules of the American Arbitration
              Association, except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-xl font-bold text-text-primary">11. Contact Information</h2>
            <p>
              If you have questions about these Terms, please contact us at{" "}
              <a href="mailto:support@cashive.gg" className="text-accent-gold hover:underline">
                support@cashive.gg
              </a>{" "}
              or through the support widget on the Platform.
            </p>
          </section>
        </div>

        <footer className="mt-16 border-t border-border pt-6 text-xs text-text-tertiary">
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-accent-gold transition-colors">Privacy Policy</Link>
            <Link href="/cookies" className="hover:text-accent-gold transition-colors">Cookie Policy</Link>
            <Link href="/terms" className="text-accent-gold">Terms of Service</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
