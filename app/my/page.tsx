import type { Metadata } from "next";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";
import { RealEstateReviewPlanner } from "../components/black-diamond/RealEstateReviewPlanner";
import { GuestWorkspace } from "../components/consumer/GuestWorkspace";
import { publicPageMetadata } from "../lib/publicMetadata";

export const metadata: Metadata = publicPageMetadata({ title: "My real-estate workspace", description: "Compare your own property references and search preferences, prepare a plan, and choose whether to request local help.", path: "/my" });

export default function MyWorkspacePage() {
  return <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
    <section className="px-5 py-6 sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><BlackDiamondHeader /></div></section>
    <section id="page-content" tabIndex={-1} className="mx-auto min-w-0 max-w-7xl space-y-8 px-5 py-8 [overflow-wrap:anywhere] sm:px-8 lg:px-10">
      <header><p className="amm-eyebrow">Your next move</p><h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">A little clarity, before a commitment.</h1><p className="mt-4 max-w-3xl leading-7">Compare interests without an account. This guest version does not sync across devices or link earlier inquiries by email. Your existing planner below remains separate and device-saved; saved property references are memory-only.</p></header>
      <GuestWorkspace />
      <p className="leading-7">Prefer a separate online comparison? <a className="underline" href="/my/account">Open the optional account beta</a>, when enabled. Guest requests never require it; past inquiries are not linked by email.</p>
      <section aria-label="Existing seller checklist and buying plan"><RealEstateReviewPlanner /></section>
    </section><Footer />
  </main>;
}
