// Presentation-only filters for the bounded admin read model. Eligibility and
// assignment still belong to the canonical SQL transaction, never this module.
export const ALLOCATION_FILTERS = ["intent","town","source","ownerId","priority","state","lifecycle"] as const;
export type AllocationFilters = Record<typeof ALLOCATION_FILTERS[number],string>;
export const EMPTY_ALLOCATION_FILTERS: AllocationFilters = {intent:"",town:"",source:"",ownerId:"",priority:"",state:"",lifecycle:""};
export function allocationPriority(score: number | null) { return score===null?"Unscored":score>=80?"HOT":score>=60?"ACTIVE":"NEW"; }
type FilterRow = { intent:string; town:string; source:string; ownerId:string|null; score:number|null; state?:string; lifecycle:string };
export function matchesAllocationFilters(row:FilterRow,filters:AllocationFilters) {
 return ALLOCATION_FILTERS.every(key=>!filters[key] || (key==="priority"?allocationPriority(row.score):key==="ownerId"?row.ownerId||"unassigned":row[key]||"no_offer")===filters[key]);
}
