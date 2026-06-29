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
    <div
      className="relative overflow-hidden py-4"
      style={{
        background: "linear-gradient(90deg, rgba(15,11,3,0.98) 0%, rgba(20,15,5,0.96) 50%, rgba(15,11,3,0.98) 100%)",
        borderTop: "1px solid rgba(212,160,23,0.22)",
        borderBottom: "1px solid rgba(212,160,23,0.22)",
        boxShadow: "inset 0 1px 0 rgba(212,160,23,0.10), inset 0 -1px 0 rgba(212,160,23,0.10), 0 4px 32px rgba(0,0,0,0.6)",
      }}
    >
      {/* Subtle ambient shimmer behind ticker */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 120% at 50% 50%, rgba(212,160,23,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Fade masks */}
      <div className="pointer-events-none absolute left-0 inset-y-0 w-32 z-10"
        style={{ background: "linear-gradient(to right, rgba(15,11,3,1) 0%, transparent 100%)" }}
      />
      <div className="pointer-events-none absolute right-0 inset-y-0 w-24 z-10"
        style={{ background: "linear-gradient(to left, rgba(15,11,3,1) 0%, transparent 100%)" }}
      />

      {/* LIVE MARKET pill badge — pinned left */}
      <div className="absolute left-4 inset-y-0 z-20 flex items-center pointer-events-none">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            background: "linear-gradient(135deg, rgba(212,160,23,0.20) 0%, rgba(212,160,23,0.10) 100%)",
            border: "1px solid rgba(212,160,23,0.40)",
            boxShadow: "0 0 12px rgba(212,160,23,0.15)",
          }}
        >
          {/* Pulsing live dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#ef4444" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.8)" }}
            />
          </span>
          <span
            className="text-[9px] font-black tracking-label uppercase whitespace-nowrap"
            style={{ color: "#D4A017" }}
          >
            LIVE MARKET
          </span>
        </div>
      </div>

      {/* Scrolling ticker */}
      <div className="flex pl-36">
        <div className="animate-ticker flex items-center gap-0 shrink-0">
          {doubled.map((fact, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-7 shrink-0"
              style={{ borderRight: "1px solid rgba(212,160,23,0.12)" }}
            >
              <span className="text-[11px] text-slate-500 whitespace-nowrap tracking-wide">{fact.label}</span>
              <span
                className="font-bebas text-lg tracking-wider text-cream whitespace-nowrap"
                style={{ letterSpacing: "0.04em" }}
              >
                {fact.value}
              </span>
              <span className="text-[10.5px] font-medium whitespace-nowrap" style={{ color: "rgba(212,160,23,0.6)" }}>
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
