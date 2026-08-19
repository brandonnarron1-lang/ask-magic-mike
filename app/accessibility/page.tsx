import type { Metadata } from "next";
import { PublicInfoPage } from "../components/black-diamond/PublicInfoPage";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Accessibility",
  description: "Accessibility information and a barrier-reporting path for the Ask Magic Mike public real estate guidance and lead-intake experience.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <PublicInfoPage
      eyebrow="Accessibility"
      title="A usable path on the device in your hand."
      intro="The public funnel is designed for keyboard, touch, mobile, and assistive-technology use, with visible focus states, labels, status messages, and a direct fallback path."
      sections={[
        { title: "Built into the flow", body: <p>Forms use labeled fields, readable contrast, keyboard-accessible controls, focusable error and success states, and mobile-friendly spacing. The embedded widget also has a direct Ask Magic Mike fallback link.</p> },
        { title: "Report a barrier", body: <p>If a page, widget, or form is difficult to use, please contact Our Town Properties through the brokerage contact path and describe the page, device, and action that caused difficulty. We will use that report to improve the experience.</p> },
        { title: "No survey claim", body: <p>Accessibility support does not change the nature of the service: public guidance and intake only. Not a survey.</p> },
      ]}
    />
  );
}
