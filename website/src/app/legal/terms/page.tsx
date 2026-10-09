import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using Hive: free trial, plans, payment, cancellation, your data and our responsibilities.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms apply to your use of Hive, the personal finance and life-tracking app at the Hive website and its
        connection for AI assistants (together, &ldquo;Hive&rdquo;). Hive is provided by {COMPANY.name}, {COMPANY.address}{" "}
        (&ldquo;we&rdquo;). By creating an account you accept these terms. Our{" "}
        <a href="/legal/privacy/">privacy policy</a> explains how we handle your data.
      </p>

      <h2>1. Your account</h2>
      <ul>
        <li>You must be at least 18 and give a valid e-mail address. Each account is for one person.</li>
        <li>Keep your password and any personal access tokens secret. You are responsible for what happens with them.</li>
        <li>Tell us right away if you think someone else is using your account.</li>
      </ul>

      <h2>2. Free trial</h2>
      <ul>
        <li>Every new account gets a free trial of all Hive Plus features for 30 days. No payment details are needed.</li>
        <li>
          The trial does not turn into a paid plan by itself. When it ends, Hive is paused until you choose a plan. Your
          data is kept, and you can still export or delete it.
        </li>
        <li>One trial per person. We may end trials that are used to get around this.</li>
      </ul>

      <h2>3. Plans and prices</h2>
      <ul>
        <li>The current plans, what they include and their prices are shown on the <a href="/pricing/">pricing page</a>. Prices are in Swiss francs and include any VAT due.</li>
        <li>
          Plans are billed in advance, monthly or yearly. A plan renews for the same period unless you cancel before the
          end of the current period. We remind you before a yearly plan renews.
        </li>
        <li>We may change prices for future periods. We tell you at least 30 days in advance, and you can cancel before the new price applies.</li>
        <li>Until online payment is available, paid plans may be granted by us directly; these terms apply to them in the same way.</li>
      </ul>

      <h2>4. Cancelling</h2>
      <ul>
        <li>You can cancel at any time. Your plan stays active until the end of the period you paid for; there is no refund for the remaining part of a period, except as set out in section 5.</li>
        <li>You can also delete your account at any time in Settings, which deletes all your data.</li>
      </ul>

      <h2>5. Right of withdrawal (consumers in the EU)</h2>
      <p>
        If you live in the European Union, you can withdraw from a paid plan within 14 days of buying it, without giving a
        reason, by telling us clearly (for example by e-mail to <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>). You
        can use this wording: &ldquo;I hereby withdraw from my contract for Hive [plan] bought on [date]. Name, e-mail of the
        account, date.&rdquo; If you asked us to start the paid service during the withdrawal period, we refund the price minus
        a proportionate amount for the days you used it. We refund within 14 days using the same means of payment. The
        free trial is free, so no withdrawal is needed to end it.
      </p>

      <h2>6. Using Hive fairly</h2>
      <p>You agree not to:</p>
      <ul>
        <li>break the law with Hive or store content that infringes other people&apos;s rights;</li>
        <li>try to access other users&apos; data, probe, overload or attack the service, or get around its limits;</li>
        <li>resell or give access to Hive to others without our written agreement.</li>
      </ul>
      <p>We may suspend accounts that break these rules, after warning you where reasonable.</p>

      <h2>7. Your data</h2>
      <ul>
        <li>What you enter in Hive stays yours. You give us only the rights we need to store, process and show it to you to provide Hive.</li>
        <li>You can export all your data at any time (Settings → Your data) and delete your account and data for good.</li>
        <li>We keep regular backups, but please keep your own copy of anything important.</li>
      </ul>

      <h2>8. Not financial advice</h2>
      <p>
        Hive helps you record and understand your own figures. It does not give financial, investment, tax or medical
        advice. Market prices come from third parties and can be delayed or wrong. Decisions you take with Hive are yours.
      </p>

      <h2>9. AI assistants</h2>
      <p>
        You can connect third-party AI assistants (for example Claude or ChatGPT) to Hive. They act on your instructions and
        under their own terms. You decide what you let them read or change, and you can disconnect them at any time.
        We are not responsible for what a third-party assistant does with data you share with it.
      </p>

      <h2>10. Availability and changes</h2>
      <p>
        We work to keep Hive available and your data safe, but we can&apos;t promise uninterrupted service. We may improve,
        change or remove features. If we remove something central to a paid plan, you can cancel and get a pro-rata refund
        for the unused period. If we ever stop Hive altogether, we will tell you at least 60 days in advance so you can
        export your data.
      </p>

      <h2>11. Liability</h2>
      <p>
        We are liable for damage we cause intentionally or through gross negligence. Otherwise, and as far as the law
        allows, our liability is limited to the amount you paid us in the 12 months before the damage, and we are not
        liable for indirect damage or lost profits. Liability for death or personal injury and any mandatory rights you
        have as a consumer are not affected.
      </p>

      <h2>12. Ending the contract</h2>
      <p>
        You can end the contract at any time by deleting your account. We can end it with 30 days&apos; notice, or right away
        for a serious breach of these terms. Paid periods we end without your fault are refunded pro rata.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may update these terms. We tell you about important changes at least 30 days before they apply. If you don&apos;t
        agree, you can cancel before then; continuing to use Hive after that means you accept the new terms.
      </p>

      <h2>14. Law and courts</h2>
      <p>
        These terms are governed by Swiss law, excluding the UN Convention on the International Sale of Goods. Courts at
        our registered seat are competent. If you are a consumer, you also keep the protection of the mandatory rules and
        the courts of the country where you live.
      </p>

      <h2>15. Contact</h2>
      <p>
        {COMPANY.name}, {COMPANY.address}. E-mail: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalPage>
  );
}
