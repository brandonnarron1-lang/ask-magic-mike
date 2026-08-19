import type { Metadata } from "next";
import { PublicInfoPage } from "../components/black-diamond/PublicInfoPage";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Privacy",
  description: "How Ask Magic Mike and Our Town Properties handle submitted lead information, attribution, consent evidence, analytics, and communication choices.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy"
      title="A clear record of what this funnel needs."
      intro="Ask Magic Mike and Our Town Properties use the information you choose to submit to review your request, prevent abuse, preserve consent, and understand which public source brought you here."
      sections={[
        { title: "Information submitted", body: <p>Depending on the path, a request may include your name, email, phone, property or target area, timeline, question, and communication choices. The service also records consent language and version, source URL, referrer, campaign parameters, widget placement, and a limited security record.</p> },
        { title: "How it is used", body: <p>Information is used to route and review the request, communicate through the contact path you provide when permitted, prevent duplicate or abusive submissions, and maintain operational and audit records. Analytics events are designed to avoid sending raw lead contact details.</p> },
        { title: "Your choices", body: <p>Do not submit information you do not want reviewed. You may ask Our Town Properties about a request, communication preference, or applicable record-handling choice through the brokerage contact path. Provider and retention details must remain aligned with the brokerage&apos;s approved policy before publication.</p> },
        { title: "Important boundary", body: <p>This site provides public-record and general real-estate intake guidance. It does not provide a survey, appraisal, guarantee, or offer through a form.</p> },
      ]}
    />
  );
}
