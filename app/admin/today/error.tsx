"use client";
export default function TodayError({reset}:{reset:()=>void}) {
  return <main className="min-h-screen bg-[#050505] p-4 text-[#f7ecd5] sm:p-8"><section role="alert" className="mx-auto max-w-2xl rounded-2xl border border-[#b7374d66] bg-[#150d0f] p-6"><h1 className="font-serif text-3xl">Command desk unavailable</h1><p className="mt-4 text-sm leading-6">The protected view did not finish loading. This is not a measured empty queue. No request, task or message was changed by this read.</p><button onClick={reset} className="mt-5 min-h-11 rounded-lg border border-[#cda24a66] px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-200">Try the protected read again</button></section></main>;
}
