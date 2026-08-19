import type { Metadata } from "next";
import { PublicInfoPage } from "../components/black-diamond/PublicInfoPage";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Terms and Real Estate Disclaimers",
  description: "Terms, fair-housing guardrails, and real estate guidance disclaimers for the Ask Magic Mike public intake experience from Our Town Properties.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms and disclaimers"
      title="Use the guidance as a starting point."
      intro="Ask Magic Mike is a public intake and guidance experience for Our Town Properties. Property-specific information and next steps require direct confirmation from the brokerage or an approved professional."
      sections={[
        { title: "General information", body: <p>Content and responses are for general informational purposes. They are not a survey, appraisal, legal opinion, tax opinion, lending decision, guarantee, or binding offer. Availability, pricing, property condition, and timing must be confirmed directly.</p> },
        { title: "Requests and follow-up", body: <p>Submitting a form creates a request for review; it does not promise a valuation, offer, appointment, response time, agency relationship, or representation agreement. A separate written agreement may be required for brokerage services.</p> },
        { title: "Responsible use", body: <p>Use accurate information, do not submit another person&apos;s private information without permission, and do not use the forms for emergencies. Our Town Properties may route, suppress, or decline a request when operational or legal requirements call for it.</p> },
        { title: "Fair housing", body: <p>Our Town Properties supports equal housing opportunity. Protected-class information is not requested for lead scoring or routing, and neighborhood guidance should not be based on protected characteristics or proxies.</p> },
      ]}
    />
  );
}
