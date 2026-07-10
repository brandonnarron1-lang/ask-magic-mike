"use client";

import Image from "next/image";
import Link from "next/link";

type HeaderProps = {
  onAsk?: () => void;
};

export function BlackDiamondHeader({ onAsk }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" aria-label="Ask Magic Mike home">
        <Image
          src="/brand/black-diamond/our-town-logo.png"
          alt="Our Town Properties"
          width={138}
          height={58}
          priority
          className="h-auto w-28 sm:w-36"
        />
      </Link>
      <nav className="hidden items-center gap-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#d9ceb8] md:flex">
        <Link href="/home-value" className="transition hover:text-[#e2c06f]">
          Home Value
        </Link>
        <Link href="/sell" className="transition hover:text-[#e2c06f]">
          Sell
        </Link>
        <Link href="/ask" className="transition hover:text-[#22c6d2]">
          Ask
        </Link>
      </nav>
      <Link
        href="/ask"
        onClick={onAsk}
        className="amm-secondary-button min-h-0 px-4 py-2 text-[#e2c06f]"
      >
        Ask Mike
      </Link>
    </header>
  );
}
