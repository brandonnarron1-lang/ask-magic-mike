import Link from "next/link";
import { PublicInfoPage } from "../components/black-diamond/PublicInfoPage";

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="Choose the contact path that fits the question."
      intro="Use the public intake flow for a property request, or contact Our Town Properties directly when a form is not the right fit."
      sections={[
        { title: "Call Our Town Properties", body: <p><a className="text-[#e2c06f] underline" href="tel:+12522437700">252-243-7700</a><br />Use the current brokerage number shown on the live Our Town Properties site. Do not use a number from an older project asset without owner confirmation.</p> },
        { title: "Start a request", body: <p><Link className="text-[#e2c06f] underline" href="/ask">Ask a question</Link>, <Link className="text-[#e2c06f] underline" href="/value">request a home-value review</Link>, or <Link className="text-[#e2c06f] underline" href="/buy">request a buyer plan</Link>. A human will review the request before follow-up.</p> },
        { title: "Brokerage site", body: <p>Visit <a className="text-[#e2c06f] underline" href="https://www.ourtownproperties.com">OurTownProperties.com</a> for the brokerage, listing, rental, and local-content surfaces.</p> },
        { title: "Boundary", body: <p>Contact information and public guidance do not establish a survey, appraisal, guarantee, or offer.</p> },
      ]}
    />
  );
}
