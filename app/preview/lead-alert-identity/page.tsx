import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadAlertPreviewGallery } from "../../components/admin/LeadAlertPreviewGallery";
import { leadAlertIdentityPreviewEnabled } from "../../lib/leadAlertDesignPreview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Lead Alert Identity Preview",
  robots: { index: false, follow: false, noarchive: true },
};

export default function LeadAlertIdentityPreviewPage() {
  if (!leadAlertIdentityPreviewEnabled(process.env.VERCEL_ENV, process.env.NODE_ENV)) notFound();

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-[#f4ead4] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="mb-6 rounded-lg border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
          Preview-only visual acceptance surface. Production returns 404. No lead, recipient, provider, queue, or send action exists here.
        </p>
        <LeadAlertPreviewGallery standalone />
      </div>
    </main>
  );
}
