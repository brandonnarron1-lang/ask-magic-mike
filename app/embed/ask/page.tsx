import type { Metadata } from "next";
import { WidgetApp } from "../../components/black-diamond/WidgetApp";
import { nonIndexablePageMetadata } from "../../lib/publicMetadata";

export const metadata: Metadata = nonIndexablePageMetadata(
  "Ask Magic Mike Embedded Intake",
  "Compatibility embed route for the Ask Magic Mike lead-intake interface.",
);

export default function LegacyEmbedAskPage() {
  return <WidgetApp />;
}
