const FACTS = [
  { label: "Licensed & Active Since", value: "1993",           note: "30+ years" },
  { label: "Career Sales Volume",     value: "$750M+",         note: "Eastern NC" },
  { label: "Homes Sold",              value: "2,500+",         note: "Wilson Co. & beyond" },
  { label: "Home Base",               value: "Wilson, NC",     note: "3301 Nash St NW" },
  { label: "Office",                  value: "252-243-7700",   note: "Our Town Properties" },
  { label: "Service Area",            value: "Wilson · Rocky Mount · Greenville", note: "Eastern NC" },
  { label: "Also Serving",            value: "Smithfield · Clayton · Kenly · Elm City", note: "& more" },
  { label: "Brokerage",               value: "Our Town Properties, Inc.", note: "NC Licensed Broker" },
];

export function MarketPulse() {
  const doubled = [...FACTS, ...FACTS];

  return (
    <div className="relative border-y border-gold-400/[0.12] bg-[#0D0B07] overflow-hidden py-3"
      style={{ boxShadow: "inset 0 1px 0 rgba(212,160,23,0.04), inset 0 -1px 0 rgba(212,160,23,0.04)" }}
    >
      {/* Fade masks */}
      <div className="pointer-events-none absolute left-0 inset-y-0 w-20 z-10 bg-gradient-to-r from-[#0D0B07] to-transparent" />
      <div className="pointer-events-none absolute right-0 inset-y-0 w-16 z-10 bg-gradient-to-l from-[#0D0B07] to-transparent" />

      {/* Header tag */}
      <div className="absolute left-4 inset-y-0 z-20 flex items-center pointer-events-none">
        <span
          className="text-[9px] font-black tracking-[0.18em] uppercase px-2.5 py-1 rounded"
          style={{
            background: "linear-gradient(135deg, #D4A017, #B8860B)",
            color: "#0A0A0A",
            boxShadow: "0 1px 4px rgba(212,160,23,0.3)",
          }}
        >
          OTP
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex pl-24">
        <div className="animate-ticker flex items-center gap-0 shrink-0">
          {doubled.map((fact, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-6 border-r border-gold-400/[0.09] shrink-0"
            >
              <span className="text-xs text-slate-500 whitespace-nowrap">{fact.label}</span>
              <span className="text-sm font-semibold text-cream whitespace-nowrap">{fact.value}</span>
              <span className="text-[10.5px] font-medium text-gold-400/55 whitespace-nowrap">
                {fact.note}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="sr-only">
        Our Town Properties — Mike Eatmon, Wilson NC real estate broker. Licensed since 1993.
        $750M+ career sales. 2,500+ homes sold. Serving Wilson County and Eastern North Carolina.
      </p>
    </div>
  );
}
