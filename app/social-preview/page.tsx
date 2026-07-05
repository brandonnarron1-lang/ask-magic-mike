import Image from "next/image";
import { BlackDiamondHeader } from "../components/black-diamond/BlackDiamondHeader";
import { Footer } from "../components/black-diamond/BlackDiamondShell";

export default function SocialPreviewPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f4ead4]">
      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <BlackDiamondHeader />
        </div>
      </section>
      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e2c06f]">Social previews</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight sm:text-6xl">
            Overlay-ready ad surfaces with live HTML copy.
          </h1>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <AdFrame type="feed" />
            <AdFrame type="story" />
          </div>
          <div className="mt-10 rounded-lg border border-[#cda24a33] bg-[#111113] p-6">
            <p className="text-lg font-semibold">UTM convention</p>
            <pre className="mt-4 overflow-auto rounded-md bg-black p-4 text-sm leading-6 text-[#d9ceb8]">
{`utm_source=facebook
utm_medium=paid_social
utm_campaign=home_value_wilson_nc
utm_content=feed_4x5_black_diamond`}
            </pre>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function AdFrame({ type }: { type: "feed" | "story" }) {
  const story = type === "story";
  return (
    <div className="rounded-lg border border-[#cda24a33] bg-[#0b0b0d] p-4">
      <div className={`relative mx-auto overflow-hidden rounded-lg border border-[#cda24a33] ${story ? "aspect-[9/16] max-w-[360px]" : "aspect-[4/5] max-w-[420px]"}`}>
        <Image
          src={story ? "/brand/black-diamond/hero-social-story.jpg" : "/brand/black-diamond/hero-social-4x5.jpg"}
          alt={story ? "9:16 Ask Magic Mike ad plate" : "4:5 Ask Magic Mike ad plate"}
          fill
          className="object-cover"
          sizes={story ? "360px" : "420px"}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.08),rgba(5,5,5,.12)_45%,rgba(5,5,5,.78))]" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e2c06f]">Wilson, NC</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[#f4ead4]">
            Wondering what your home could be worth?
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#d9ceb8]">
            Start with the address. Mike will follow up with local context.
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm text-[#d9ceb8]">{story ? "9:16 story/reel live overlay preview" : "4:5 feed ad live overlay preview"}</p>
    </div>
  );
}
