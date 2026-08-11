import { BuyerIntentSection } from "../../components/black-diamond/BuyerIntentSection";
import { BlackDiamondHeader } from "../../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../../components/black-diamond/BlackDiamondShell";
import { PageTracker } from "../../components/black-diamond/PageTracker";

function displayProperty(value: string) {
  return decodeURIComponent(value).replace(/[-_]+/g, " ").slice(0, 160);
}

export default async function OpenHousePage({ params }: { params: Promise<{ propertyOrId: string }> }) {
  const { propertyOrId } = await params;
  const propertyLabel = displayProperty(propertyOrId);

  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <PageTracker funnelName="open_house" />
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><BlackDiamondHeader /></div></section>
      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.86fr_1.14fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Open house</p>
            <h1 className="mt-4 font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">Register your interest before you arrive.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d9ceb8]">Share a contact path for this open-house request. The approved host or Mike can confirm event details and follow up directly.</p>
            <p className="mt-5 text-sm text-[#8f8778]">Property or event reference: <span className="text-[#d9ceb8]">{propertyLabel}</span></p>
          </div>
          <BuyerIntentSection
            surface="open_house"
            preset="open_house"
            propertyId={propertyOrId}
            propertyLabel={propertyLabel}
          />
        </div>
      </section>
      <Footer />
    </main>
  );
}
