import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { mikeIdentity } from "../../lib/mikeIdentity";

export function MikeIdentitySection({ profile = false }: { profile?: boolean }) {
  const Heading = profile ? "h1" : "h2";

  return (
    <section aria-labelledby="mike-identity-heading" className="border-t border-[#cda24a2e] bg-[#080808] px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] md:gap-14">
        <figure className="mx-auto w-full max-w-sm">
          <Image
            src={mikeIdentity.portraitSrc}
            alt={mikeIdentity.portraitAlt}
            width={1024}
            height={1024}
            sizes="(max-width: 767px) calc(100vw - 40px), 384px"
            priority={profile}
            className="h-auto w-full rounded-xl"
          />
          <figcaption className="mt-3 text-sm leading-6 text-[#d9ceb8]">Mike Eatmon · Our Town Properties, Inc. · Wilson, North Carolina</figcaption>
        </figure>
        <div className="min-w-0">
          <Image src={mikeIdentity.logoSrc} alt="Our Town Properties, Inc." width={343} height={180} className="mb-5 h-auto w-36" />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Meet the broker</p>
          <Heading id="mike-identity-heading" className="mt-4 font-serif text-4xl leading-tight text-[#f4ead4] sm:text-5xl">Mike Eatmon · Magic Mike</Heading>
          <p className="mt-4 text-base leading-7 text-[#e2c06f]">Real estate broker · Our Town Properties, Inc. · Wilson, North Carolina</p>
          <p className="mt-5 leading-7 text-[#d9ceb8]">Mike Eatmon, known as Magic Mike, is a real estate broker with Our Town Properties, Inc. in Wilson, North Carolina. Ask Magic Mike connects visitors with local real estate guidance and Mike&apos;s team.</p>
          <p className="mt-4 text-sm leading-7 text-[#d9ceb8]">The Ask Magic Mike digital assistant is an automated service for Mike&apos;s team. It is not Mike personally. A licensed real estate professional can review a request and follow up.</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            <a href={siteConfig.agentProfileUrl} className="inline-flex min-h-11 items-center text-[#e2c06f] underline underline-offset-4">Mike&apos;s official brokerage biography</a>
            {profile ? (
              <Link href="/contact" className="inline-flex min-h-11 items-center text-[#e2c06f] underline underline-offset-4">Contact Mike&apos;s team</Link>
            ) : (
              <Link href={mikeIdentity.profilePath} className="inline-flex min-h-11 items-center text-[#e2c06f] underline underline-offset-4">More about Mike Eatmon</Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
