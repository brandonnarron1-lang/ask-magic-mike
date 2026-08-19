import type { Metadata } from "next";
import { WidgetApp } from "../components/black-diamond/WidgetApp";
import { nonIndexablePageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = nonIndexablePageMetadata(
  "Ask Magic Mike Widget",
  "Embeddable Ask Magic Mike lead-intake interface.",
);

export default function WidgetPage() {
  return <WidgetApp />;
}
