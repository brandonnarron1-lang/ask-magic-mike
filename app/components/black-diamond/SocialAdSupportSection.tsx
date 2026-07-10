import Image from "next/image";
import Link from "next/link";

export function SocialAdSupportSection() {
  return (
    <section className="bg-[#050505] px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Social ad support</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4]">
            Approved 4:5 and 9:16 plates, with ad copy kept as live overlay text.
          </h2>
          <p className="mt-4 text-[#d9ceb8]">
            The creative system uses the same Mike photography while keeping Meta ad headlines editable and testable.
          </p>
          <Link href="/social-preview" className="mt-6 inline-flex rounded-full border border-[#cda24a66] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#f4ead4] transition hover:border-[#e2c06f]">
            View Social Previews
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Image
            src="/brand/black-diamond/hero-social-4x5.jpg"
            alt="Approved Ask Magic Mike 4:5 social ad visual plate"
            width={540}
            height={675}
            priority
            className="h-auto rounded-lg border border-[#cda24a33] bg-[#111113]"
          />
          <Image
            src="/brand/black-diamond/hero-social-story.jpg"
            alt="Approved Ask Magic Mike story ad visual plate"
            width={540}
            height={960}
            priority
            className="h-auto rounded-lg border border-[#cda24a33] bg-[#111113]"
          />
        </div>
      </div>
    </section>
  );
}
