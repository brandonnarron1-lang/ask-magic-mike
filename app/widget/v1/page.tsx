import type { Metadata } from "next";
import { WidgetApp } from "../../components/black-diamond/WidgetApp";
import { nonIndexablePageMetadata } from "../../lib/publicMetadata";

export const metadata: Metadata = nonIndexablePageMetadata(
  "Ask Magic Mike Widget",
  "Versioned embeddable Ask Magic Mike lead-intake interface.",
);

/** Versioned widget entry point. Keep /widget as a compatibility alias. */
export default function WidgetV1Page() {
  return <WidgetApp />;
}
