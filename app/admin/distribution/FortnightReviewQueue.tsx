import Image from "next/image";
import { currentFortnightReviewQueue, formatFortnightReviewItem } from "../../../src/lib/content/reviewed-launch-work-item";
import { CopyDemandAsset } from "./CopyDemandAsset";

/** Server-only composition; caller must enforce growth:manage before rendering.
 * A review export is not an approval, installed schedule or publication record. */
export function FortnightReviewQueue() {
  let items: ReturnType<typeof currentFortnightReviewQueue>;
  try { items = currentFortnightReviewQueue(); }
  catch {
    return <section aria-label="Fortnight review queue" className="mt-6 rounded-xl border border-[#cda24a66] p-5">
      <h2 className="font-serif text-2xl">14-day draft review queue</h2>
      <p role="alert" className="mt-3 text-sm">Kit integrity or registered destination could not be verified. Drafts are unavailable; no publication or scheduling occurred. The acquisition report remains independent.</p>
    </section>;
  }
  return <section aria-label="Fortnight review queue" className="mt-6 min-w-0 rounded-2xl border border-[#cda24a55] bg-[#0c0b09] p-4 [overflow-wrap:anywhere] sm:p-6">
    <details>
      <summary className="min-h-11 cursor-pointer py-2 font-serif text-2xl text-[#f4ead4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]">14-day draft review queue</summary>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#c9bdab]">Review-only · no dates, reviewer or channel account assigned. Nothing here is scheduled or published. Check the existing publication ledger before any separately authorized post; the October 15 and 22 posts remain unchanged. Relative days are editorial slots, not permission to post daily.</p>
      <p className="mt-3 text-sm leading-7 text-[#c9bdab]">NC education references are not approved retrieval sources. Rights, current applicability and broker review remain held. Feedback invitations are neutral and voluntary, for genuine customers only; no rating incentives, sentiment filtering or automatic outreach.</p>
      <ol className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2">
        {items.map(item => <li key={item.day} className="min-w-0 rounded-xl border border-white/15 bg-black/30 p-4">
          <details>
            <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-[#f0cf79] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9edbe2]">Day {item.day} · {item.title}</summary>
            <p className="mt-3 text-sm text-[#b9ae9d]">{item.purpose} · {item.channel === "instagram" ? "Story draft" : "Feed draft"} · REVIEW REQUIRED / NOT PUBLISHED</p>
            <p className="mt-3 text-sm leading-7"><strong>Audience:</strong> {item.audience}</p>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7">{item.caption}</p>
            <div className="mt-4 flex flex-wrap items-start gap-4">
              <Image src={item.assetUrl} alt={item.alt} width={180} height={item.channel === "instagram" ? 320 : 225} sizes="180px" className="h-auto w-44 max-w-full rounded-lg" />
              <div className="min-w-0 flex-1 basis-48 text-sm leading-7">
                <p><strong>Alt text:</strong> {item.alt}</p>
                <a href={item.link} className="mt-2 block min-h-11 break-words py-2 text-[#9edbe2] underline">Open matching {item.offer === "homeValue" ? "home value" : item.offer === "buyer" ? "buying help" : "selling options"} destination</a>
                <a href={item.assetUrl} download className="block min-h-11 py-2 text-[#f0cf79] underline">Existing {item.channel === "instagram" ? "Story" : "feed"} image</a>
              </div>
            </div>
            <details className="mt-3 rounded border border-white/10 p-3">
              <summary className="min-h-11 cursor-pointer py-2 text-sm">Evidence and review holds</summary>
              <p className="mt-2 break-words text-sm leading-7">{item.substantiation} {item.sourceFreshness}</p>
              <p className="mt-2 break-words text-sm leading-7">Template {item.version}. Image SHA-256: {item.assetHash}. Reviewer, review time and proposed publication time: not recorded.</p>
              {item.reference ? <div className="mt-3 text-sm leading-7">
                <a href={item.reference.url} className="block min-h-11 py-2 text-[#9edbe2] underline">{item.reference.title} — reference only</a>
                <p>{item.reference.publisher} · {item.reference.geography} · publication: {item.reference.publicationDate}. {item.reference.freshness}. {item.reference.rights}.</p>
              </div> : null}
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7">{item.holds.map(hold => <li key={hold}>{hold}</li>)}</ul>
            </details>
            <p className="my-3 text-sm leading-7 text-[#c9bdab]">{item.linkInstruction}</p>
            <CopyDemandAsset label={`Copy day ${item.day} review packet`} value={formatFortnightReviewItem(item)} comfortable />
          </details>
        </li>)}
      </ol>
    </details>
  </section>;
}
