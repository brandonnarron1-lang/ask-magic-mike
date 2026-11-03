import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage } from "../components/black-diamond/PublicInfoPage";
import { publicPageMetadata } from "../lib/publicMetadata";
import { PublicMikeContact } from "../components/black-diamond/PublicMikeContact";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact Ask Magic Mike and Our Town Properties",
  description: "Choose the appropriate public intake or brokerage contact path for a Wilson-area property, seller, buyer, renter, or general real estate question.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="Choose the contact path that fits the question."
      intro="Use the public intake flow for a property request, or contact Our Town Properties directly when a form is not the right fit."
      sections={[
        { title: "Contact Magic Mike directly", body: <PublicMikeContact surface="public_header" /> },
        { title: "Our Town Properties office", body: <p><a className="inline-flex min-h-11 items-center text-[#e2c06f] underline" href="tel:+12522437700">{siteConfig.officePhoneDisplay}</a><br />The brokerage office is separate from Mike’s direct line above.</p> },
        { title: "Start a request", body: <p><Link className="text-[#e2c06f] underline" href="/ask">Ask a question</Link>, <Link className="text-[#e2c06f] underline" href="/home-value">request a home-value review</Link>, or <Link className="text-[#e2c06f] underline" href="/buy">request a buyer plan</Link>. A human will review the request before follow-up.</p> },
        { title: "Brokerage site", body: <p>Visit <a className="text-[#e2c06f] underline" href="https://www.ourtownproperties.com">OurTownProperties.com</a> for the brokerage, listing, rental, and local-content surfaces.</p> },
        { title: "Boundary", body: <p>Contact information and public guidance do not establish a survey, appraisal, guarantee, or offer.</p> },
      ]}
    />
  );
}
