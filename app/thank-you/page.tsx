import Link from "next/link";

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-5 py-20 text-[#f4ead4] sm:px-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-[#cda24a33] bg-[#111113] p-8 sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Request received</p>
        <h1 className="mt-4 font-serif text-5xl leading-tight">Your request is in.</h1>
        <p className="mt-5 text-lg leading-8 text-[#d9ceb8]">Mike or the approved Our Town Properties team will review the information you shared and follow up through the contact path you selected.</p>
        <p className="mt-5 text-sm leading-6 text-[#8f8778]">This page does not promise a valuation, offer, appointment, availability, or response time. Not a survey.</p>
        <Link href="/" className="amm-primary-button mt-8 inline-flex px-5 py-3">Return to Ask Magic Mike</Link>
      </div>
    </main>
  );
}
