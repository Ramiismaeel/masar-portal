import Link from "next/link";

/**
 * Portal-specific — NOT a copy of masar-center.de/privacy. The marketing
 * site's policy covers a public brochure site (contact forms, Google
 * Analytics/GTM, Meta/WhatsApp Business). This portal collects a
 * fundamentally different, more sensitive set of data (passports, criminal
 * record extracts, medical reports) and has none of the marketing site's
 * analytics — see the Cookies section below and docs/roadmap.md "Phase 8"
 * for what was actually found in this codebase, not assumed.
 *
 * Two real gaps flagged in docs/roadmap.md, not silently glossed over here:
 * - Section 4's "by uploading, you consent" is the current mechanism, not a
 *   proper opt-in checkbox — a real one is the safer follow-up.
 * - Section 6 names Cloudmersive and Resend without a confirmed processing
 *   region — flagged for Rami to confirm/get a DPA, not guessed at.
 */
export function DatenschutzEn() {
  return (
    <>
      <section>
        <h2>1. Who is responsible</h2>
        <p>
          Masar UG (haftungsbeschränkt), Hünxer Str. 121, 46537 Dinslaken,
          Germany. Contact: info@masar-center.de, +49 177 1873142. Full
          registration details are in our{" "}
          <Link href="/impressum">Impressum</Link>.
        </p>
      </section>

      <section>
        <h2>2. What this policy covers</h2>
        <p>
          This policy describes how Masar Portal (portal.masar-center.de)
          processes your personal data when you create an account, complete
          the application wizard, and upload documents for our consulting
          services. It is specific to the portal — separate from, and
          processed independently of, any data collected through the main
          masar-center.de website.
        </p>
      </section>

      <section>
        <h2>3. What we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong>: name, email address, phone number,
            password (stored as a salted hash, never in plain text), your
            preferred language.
          </li>
          <li>
            <strong>Application data</strong>: the visa category you apply
            under, your full name as printed in your passport, passport
            number and expiry date, and answers to the wizard&apos;s
            category-specific questions (e.g. the language your programme is
            taught in, or your medical profession).
          </li>
          <li>
            <strong>Documents you upload</strong>: depending on your
            category, this can include your passport, biometric photos,
            educational certificates and transcripts, language certificates,
            a criminal record extract, birth and civil registry documents,
            professional licences, and — for Medical (D16) applications — a
            medical report. Your in-app checklist shows the exact list for
            your category.
          </li>
          <li>
            <strong>Review data</strong>: when our staff review a document,
            we record a status (approved / needs revision / rejected) and,
            where relevant, a short note explaining what needs to change.
          </li>
          <li>
            <strong>Technical data</strong>: standard connection information
            collected by our hosting infrastructure (e.g. IP address,
            timestamp) as part of normal server operation and security
            logging.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Sensitive documents</h2>
        <p>
          A criminal record extract, and — for Medical (D16) applications — a
          medical report, are documents of a more sensitive nature under
          Art. 9/10 GDPR. We collect them only because they are documents the
          relevant authorities require for your specific application, only
          from applicants who choose that category, and only for as long as
          needed to support your application. Uploading these documents is
          your explicit consent to our processing them for this purpose; you
          can withdraw that consent at any time by contacting us (Section 9),
          though we may then be unable to continue processing your
          application.
        </p>
      </section>

      <section>
        <h2>5. Why we process your data (legal basis)</h2>
        <ul>
          <li>
            Art. 6(1)(b) GDPR — to perform the consulting services contract
            between you and Masar UG (processing your application, tracking
            checklist progress, reviewing documents).
          </li>
          <li>
            Art. 6(1)(a) / Art. 9(2)(a) GDPR — your explicit consent, for the
            sensitive documents described in Section 4.
          </li>
          <li>
            Art. 6(1)(f) GDPR — our legitimate interest in keeping the portal
            secure (e.g. malware scanning of uploads, access logging).
          </li>
          <li>
            Art. 6(1)(c) GDPR — compliance with legal obligations that apply
            to us.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Who we share it with</h2>
        <p>
          We do not sell your data. It is shared only with service providers
          who process it on our behalf (Art. 28 GDPR processors), each bound
          by a data processing agreement, and only to the extent needed to
          run the portal:
        </p>
        <ul>
          <li>
            <strong>Neon</strong> (database hosting) — Frankfurt, Germany
            (EU).
          </li>
          <li>
            <strong>Cloudflare R2</strong> (document storage) — configured to
            store data within the EU jurisdiction.
          </li>
          <li>
            <strong>Cloudmersive</strong> (automated malware scanning of
            every uploaded file, before it is stored).
          </li>
          <li>
            <strong>Resend</strong> (sending account and notification
            emails).
          </li>
          <li>
            <strong>Vercel</strong> (application hosting) — Frankfurt,
            Germany (EU) region.
          </li>
        </ul>
        <p>
          Where a provider may process data outside the EU/EEA, we rely on
          appropriate safeguards under Art. 46 GDPR, such as the European
          Commission&apos;s Standard Contractual Clauses. Masar UG staff who
          review applications can see your documents and application data as
          needed to do that review; they are bound to confidentiality.
        </p>
      </section>

      <section>
        <h2>7. How long we keep it</h2>
        <p>
          We keep your account, application, and document data for as long
          as you have an active application with us, and for a reasonable
          period afterwards in case you need to reopen your case or for our
          own record-keeping. We do not yet offer automatic deletion after a
          fixed period or a self-service &quot;delete my account&quot;
          option — this is a planned feature. Until then, you can ask us at
          any time (Section 9) to delete your data, and we will do so unless
          we are legally required to keep it.
        </p>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p>Under GDPR you have the right to:</p>
        <ul>
          <li>access the personal data we hold about you (Art. 15),</li>
          <li>have inaccurate data corrected (Art. 16),</li>
          <li>have your data deleted (Art. 17),</li>
          <li>restrict how we process it (Art. 18),</li>
          <li>receive a copy of it in a portable format (Art. 20),</li>
          <li>
            object to processing based on our legitimate interest (Art. 21),
          </li>
          <li>
            withdraw consent at any time, without affecting processing that
            happened before the withdrawal,
          </li>
          <li>
            lodge a complaint with a supervisory authority — in our case, the
            Landesbeauftragte für Datenschutz und Informationsfreiheit
            Nordrhein-Westfalen (LDI NRW).
          </li>
        </ul>
      </section>

      <section>
        <h2>9. How to reach us</h2>
        <p>
          For any of the above, or any question about your data, email{" "}
          <a href="mailto:info@masar-center.de">info@masar-center.de</a>.
        </p>
      </section>

      <section id="cookies">
        <h2>10. Cookies</h2>
        <ul>
          <li>
            <strong>session</strong> (Better Auth) — keeps you signed in —
            deleted when you sign out, or expires automatically.
          </li>
          <li>
            <strong>locale</strong> — remembers your language choice — 1
            year.
          </li>
          <li>
            <strong>cookie-consent</strong> — remembers the choice you make
            in the cookie banner — 1 year.
          </li>
        </ul>
        <p>
          We do not currently use any analytics, advertising, or tracking
          cookies. If that ever changes, we will ask for your consent again
          before doing so, and update this section.
        </p>
      </section>

      <section>
        <h2>11. Security</h2>
        <p>
          We take reasonable technical and organisational measures to
          protect your data: encrypted connections (HTTPS) throughout,
          automatic malware scanning of every uploaded file before it is
          stored, storage within the EU, and documents that are never
          publicly accessible — staff view them only through short-lived,
          individually generated links.
        </p>
      </section>

      <section>
        <h2>12. Changes to this policy</h2>
        <p>
          We may update this policy as the portal changes. The date at the
          top of this page shows when it was last updated.
        </p>
      </section>
    </>
  );
}
