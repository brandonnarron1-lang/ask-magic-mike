"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";

type HeaderProps = {
  onAsk?: () => void;
};

function focusPageContent(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById("page-content");
  if (!target) return;
  event.preventDefault();
  target.focus();
}

export function BlackDiamondHeader({ onAsk }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <a
        href="#page-content"
        onClick={focusPageContent}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-md focus:border focus:border-[#e2c06f] focus:bg-[#050505] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#f4ead4] focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#22c6d2] focus:ring-offset-2 focus:ring-offset-[#050505]"
      >
        Skip to main content
      </a>
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
        <Link href="/buy" className="transition hover:text-[#e2c06f]">
          Buy
        </Link>
        <Link href="/plan" className="transition hover:text-[#e2c06f]">
          Plan
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
