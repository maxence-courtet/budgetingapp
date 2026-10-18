import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal data Hive processes, why, with whom, for how long, and your rights.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        This policy explains what personal data Hive processes when you use the Hive app, this website and the Hive
        connection for AI assistants (MCP), why we process it, who we share it with and what your rights are. It is
        written to meet the Swiss Federal Act on Data Protection (nFADP) and, where it applies to you, the EU General Data
        Protection Regulation (GDPR).
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        The controller is {COMPANY.name}, {COMPANY.address}. For anything about your data, write to{" "}
        <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
      </p>
      <p>Representative in the European Union (GDPR art. 27): {COMPANY.euRepresentative}.</p>

      <h2>2. What we process and why</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Why</th>
            <th>Legal basis (GDPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account: name, e-mail address, password (stored only as a secure hash), or your Google account identifier if you sign in with Google</td>
            <td>To create your account and let you sign in</td>
            <td>Contract (art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>What you enter: accounts, transactions, budgets, investments and trades, habits, goals, notes and journal entries</td>
            <td>To provide Hive: storing it and showing it back to you, including reports and charts</td>
            <td>Contract (art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>Health data in Fitness: weight, body measurements, workouts and steps</td>
            <td>To show your fitness progress. Only stored after you give explicit consent in the app</td>
            <td>Explicit consent (art. 9(2)(a)); nFADP art. 6(7)</td>
          </tr>
          <tr>
            <td>Plan and trial: plan, start and end dates, accepted terms version</td>
            <td>To manage your trial and subscription, and to keep a record of what you agreed to</td>
            <td>Contract (art. 6(1)(b)); legal obligation (art. 6(1)(c))</td>
          </tr>
          <tr>
            <td>Sign-in sessions: IP address, browser and device type, time</td>
            <td>To keep you signed in and protect your account against misuse</td>
            <td>Legitimate interest in security (art. 6(1)(f))</td>
          </tr>
          <tr>
            <td>AI assistant connections: the assistants you approve, personal access tokens (stored hashed), request counts</td>
            <td>To let the assistants you choose read and add to your Hive, and to limit abuse</td>
            <td>Contract (art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>Server logs: IP address, time, requested address, errors</td>
            <td>To run, secure and fix the service</td>
            <td>Legitimate interest (art. 6(1)(f))</td>
          </tr>
          <tr>
            <td>Messages you send us</td>
            <td>To answer you</td>
            <td>Contract or legitimate interest (art. 6(1)(b), (f))</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not use your data for advertising, we do not sell it, and we do not build profiles of you. Hive has no
        built-in AI: nothing you store is sent to an AI model unless you connect an assistant yourself (section 4).
      </p>

      <h2>3. Cookies and local storage</h2>
      <p>
        The Hive app uses only cookies that are strictly necessary: a session cookie that keeps you signed in and
        security cookies for signing in. Your theme and colour choices are saved in your browser&apos;s local storage. This
        website uses no cookies, analytics or trackers. Because nothing beyond what is strictly necessary is stored, we
        don&apos;t ask for cookie consent.
      </p>

      <h2>4. Who receives data</h2>
      <ul>
        <li>
          <strong>Railway Corporation</strong> (USA) hosts the app, the website and the database, as our processor under a
          data processing agreement. Your data is stored in the {COMPANY.hostingRegion} region.
        </li>
        <li>
          <strong>Google</strong> receives a sign-in request only if you choose &ldquo;Continue with Google&rdquo;.
        </li>
        <li>
          <strong>Yahoo Finance</strong> receives the ticker symbols of your investments (for example &ldquo;AAPL&rdquo;) to
          look up prices. No personal data is sent with them.
        </li>
        <li>
          <strong>AI assistants you connect</strong> (for example Claude or ChatGPT) receive the data they request on your
          behalf once you approve them. They process it under their own terms and privacy policies. You can disconnect
          them at any time in Settings → AI assistants.
        </li>
        <li>
          <strong>A payment provider</strong> will process payments when paid plans open. We will name it here before then.
        </li>
        <li>Authorities, only where the law requires us to.</li>
      </ul>

      <h2>5. Data outside Switzerland and the EU</h2>
      <p>
        Railway is a US company. Where personal data is processed in a country without an adequate level of protection,
        we rely on recognised safeguards: the Swiss-US and EU-US Data Privacy Frameworks where the recipient is certified,
        or the standard contractual clauses approved by the FDPIC and the European Commission.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>Your account and everything you entered: until you delete your account. Deletion removes it from our live database immediately.</li>
        <li>Backups: deleted data can remain in encrypted backups for up to 30 days until they are overwritten.</li>
        <li>Health data: until you withdraw consent or delete your account; withdrawing consent deletes it.</li>
        <li>When a trial or plan ends, your data is kept so you can return, export it or delete it.</li>
        <li>Server logs: up to 30 days.</li>
        <li>Records we must keep by law (for example invoices, once payments start): 10 years.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>You can, at any time and free of charge:</p>
      <ul>
        <li>get a copy of your data, also in a machine-readable format (Settings → Your data → Download);</li>
        <li>correct it, directly in the app;</li>
        <li>delete your account and all its data (Settings → Your data → Delete my account);</li>
        <li>withdraw your consent for health data (Settings → Your data), without affecting earlier processing;</li>
        <li>object to processing based on legitimate interest, or ask us to restrict processing;</li>
        <li>
          complain to a supervisory authority: in Switzerland the Federal Data Protection and Information Commissioner
          (FDPIC, <a href="https://www.edoeb.admin.ch">edoeb.admin.ch</a>), or in the EU the authority of the country where
          you live.
        </li>
      </ul>
      <p>
        For anything not covered in the app, write to <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>;
        we answer within 30 days.
      </p>

      <h2>8. Security</h2>
      <p>
        Connections are encrypted (HTTPS). Passwords and access tokens are stored only as hashes. Each request is tied to
        one account, so no user or assistant can see another user&apos;s data. Access for assistants uses short-lived
        tokens that you can revoke. If a breach is likely to put you at risk, we will tell you and the authorities as the
        law requires.
      </p>

      <h2>9. Age</h2>
      <p>Hive is meant for adults. You must be at least 18 to create an account.</p>

      <h2>10. Changes</h2>
      <p>
        We update this policy when what we do with data changes. For important changes we tell you in the app or by
        e-mail before they take effect. The date at the top shows the current version.
      </p>
    </LegalPage>
  );
}
