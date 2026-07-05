import { brand } from "../../lib/constants";

export function TrustProofStrip() {
  const items = [
    brand.brokerage,
    brand.cityLine,
    brand.licensedLine,
    "Local real estate guidance",
  ];

  return (
    <section className="border-y border-[#cda24a2e] bg-[#080808] px-5 py-5 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#d9ceb8] sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item} className="border-l border-[#cda24a55] pl-4">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
