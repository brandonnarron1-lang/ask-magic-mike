import { coveredWait, savedReviewObjective } from "../../lib/humanReviewPolicy";
import { deskDate } from "../../lib/adminTodayDesk";

export function HumanReviewObjective({ value, now, held=false }: {value:unknown; now:string; held?:boolean}) {
  const saved=savedReviewObjective(value);
  const wait=saved ? coveredWait(saved.acceptedAt,now) : null;
  const target=saved ? new Intl.DateTimeFormat("en-US",{timeZone:saved.timezone,month:"short",day:"numeric",hour:"numeric",minute:"2-digit",second:"2-digit",fractionalSecondDigits:3,timeZoneName:"short"}).format(new Date(saved.targetAt)) : null;
  return <section aria-label="Initial human review" className="mt-3 rounded-lg border border-[#cda24a33] p-3 text-sm leading-6">
    <h3 className="font-semibold text-[#e2c06f]">Initial human review</h3>
    {held ? <p>Held / restricted — internal review only. No actionable contact handoff or response deadline is asserted.</p>
      : saved ? <><p>Internal first-review objective: <time dateTime={saved.targetAt}>{target}</time>{Date.parse(now)>Date.parse(saved.targetAt)?" · target passed; check actual review history":""}.</p>
        <p>Server accepted request: {deskDate(saved.acceptedAt,saved.timezone)}. Covered waiting: {wait===null?"Unknown":`${Math.floor(wait)} min`}. Total age since capture remains shown separately.</p>
        <p className="text-xs">{saved.policyVersion} · {saved.timezone}. Five covered minutes is a review objective, not a promised reply or booking. Ownership and current permission remain authoritative; review history is not inferred from this clock.</p></>
        : <p>Review target unknown — no saved coverage-policy evidence. Historical deadlines have not been invented or changed.</p>}
  </section>;
}
