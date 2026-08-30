import type { ReactNode } from "react";
import { BlackDiamondHeader } from "./BlackDiamondHeader";
import { Footer } from "./BlackDiamondShell";

type PublicInfoPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: ReactNode }>;
};

export function PublicInfoPage({ eyebrow, title, intro, sections }: PublicInfoPageProps) {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <section className="bg-[#050505] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl"><BlackDiamondHeader /></div>
      </section>
      <section id="page-content" tabIndex={-1} className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#22c6d2]">{eyebrow}</p>
          <h1 className="mt-4 font-serif text-5xl leading-tight text-[#f4ead4] sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#d9ceb8]">{intro}</p>
          <div className="mt-10 grid gap-5">
            {sections.map((section) => (
              <section key={section.title} className="rounded-lg border border-[#cda24a33] bg-[#111113] p-6">
                <h2 className="font-serif text-2xl text-[#f4ead4]">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-[#d9ceb8]">{section.body}</div>
              </section>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
