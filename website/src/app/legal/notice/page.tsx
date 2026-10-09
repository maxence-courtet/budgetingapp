import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Legal notice",
  description: "Who operates Hive and how to reach us.",
};

export default function NoticePage() {
  return (
    <LegalPage title="Legal notice">
      <h2>Operator</h2>
      <p>
        {COMPANY.name}
        <br />
        {COMPANY.address}
      </p>

      <h2>Contact</h2>
      <p>
        E-mail: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>

      <h2>Registration</h2>
      <p>
        {COMPANY.register}
        <br />
        {COMPANY.vat}
      </p>

      <h2>Data protection</h2>
      <p>
        Privacy contact: <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>. EU representative:{" "}
        {COMPANY.euRepresentative}. See the <a href="/legal/privacy/">privacy policy</a>.
      </p>

      <h2>Hosting</h2>
      <p>Railway Corporation, San Francisco, USA; data stored in the {COMPANY.hostingRegion} region.</p>

      <h2>Liability for links</h2>
      <p>
        This website links to other websites (for example the help pages of AI assistants). We have no control over their
        content and are not responsible for it.
      </p>
    </LegalPage>
  );
}
