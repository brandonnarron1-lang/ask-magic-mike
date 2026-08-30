"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

type HeaderProps = {
  onAsk?: () => void;
};

const primaryNavigation = [
  { href: "/home-value", label: "Home Value", accent: "gold" },
  { href: "/sell", label: "Sell", accent: "gold" },
  { href: "/buy", label: "Buy", accent: "cyan" },
  { href: "/plan", label: "Plan", accent: "gold" },
  { href: "/ask", label: "Ask", accent: "cyan" },
] as const;

function focusPageContent(event: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById("page-content");
  if (!target) return;
  event.preventDefault();
  target.focus();
  // Some browsers restore focus to the activated anchor after its click
  // handler finishes. Reassert focus once that activation cycle completes so
  // keyboard users reliably land on the intended content target.
  window.setTimeout(() => {
    if (target.isConnected) target.focus();
  }, 0);
}

export function BlackDiamondHeader({ onAsk }: HeaderProps) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const mobileNavigationButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileNavigationOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) {
        setMobileNavigationOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [mobileNavigationOpen]);

  function isCurrentPath(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function closeMobileNavigation() {
    setMobileNavigationOpen(false);
  }

  function handleMobileNavigationKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!mobileNavigationOpen || event.key !== "Escape") return;
    event.preventDefault();
    closeMobileNavigation();
    mobileNavigationButton.current?.focus();
  }

  return (
    <header
      ref={header}
      onKeyDown={handleMobileNavigationKeyDown}
      className="relative z-50 flex items-center justify-between gap-3 sm:gap-4"
    >
      <a
        href="#page-content"
        onClick={focusPageContent}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-md focus:border focus:border-[#e2c06f] focus:bg-[#050505] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#f4ead4] focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#22c6d2] focus:ring-offset-2 focus:ring-offset-[#050505]"
      >
        Skip to main content
      </a>
      <Link href="/" aria-label="Ask Magic Mike home" className="shrink-0">
        <Image
          src="/brand/black-diamond/our-town-logo.png"
          alt="Our Town Properties"
          width={138}
          height={58}
          priority
          className="h-auto w-24 min-[360px]:w-28 sm:w-36"
        />
      </Link>
      <nav
        aria-label="Primary navigation"
        className="hidden items-center gap-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#d9ceb8] md:flex"
      >
        {primaryNavigation.map((item) => {
          const current = isCurrentPath(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`border-b pb-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c6d2] focus-visible:ring-offset-4 focus-visible:ring-offset-[#050505] ${
                current
                  ? item.accent === "cyan"
                    ? "border-[#22c6d2] text-[#22c6d2]"
                    : "border-[#e2c06f] text-[#e2c06f]"
                  : item.accent === "cyan"
                    ? "border-transparent hover:text-[#22c6d2]"
                    : "border-transparent hover:text-[#e2c06f]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/ask"
          onClick={onAsk}
          className="amm-secondary-button min-h-0 whitespace-nowrap px-3 py-2 text-[#e2c06f] sm:px-4"
        >
          Ask Mike
        </Link>
        <button
          ref={mobileNavigationButton}
          type="button"
          aria-label={mobileNavigationOpen ? "Close site navigation" : "Open site navigation"}
          aria-expanded={mobileNavigationOpen}
          aria-controls="amm-mobile-navigation"
          onClick={() => setMobileNavigationOpen((open) => !open)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#cda24a66] bg-black/35 text-[#f4ead4] shadow-[0_16px_36px_rgba(0,0,0,.34)] backdrop-blur-md transition hover:border-[#e2c06f] hover:text-[#e2c06f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c6d2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] md:hidden"
        >
          {mobileNavigationOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
        </button>
      </div>

      {mobileNavigationOpen ? (
        <nav
          id="amm-mobile-navigation"
          aria-label="Mobile primary navigation"
          className="absolute left-0 right-0 top-[calc(100%+0.75rem)] rounded-2xl border border-[#cda24a55] bg-[#090909f5] p-3 shadow-[0_24px_80px_rgba(0,0,0,.72)] backdrop-blur-xl md:hidden"
        >
          <p className="px-2 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#8f8778]">
            Choose your path
          </p>
          <div className="grid grid-cols-2 gap-2">
            {primaryNavigation.map((item) => {
              const current = isCurrentPath(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  onClick={() => {
                    closeMobileNavigation();
                    if (item.href === "/ask") onAsk?.();
                  }}
                  className={`flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c6d2] ${item.href === "/ask" ? "col-span-2" : ""} ${
                    current
                      ? item.accent === "cyan"
                        ? "border-[#22c6d2aa] bg-[#22c6d21a] text-[#9df2f5]"
                        : "border-[#e2c06faa] bg-[#e2c06f1a] text-[#f4d88d]"
                      : "border-white/10 bg-white/[.035] text-[#f4ead4] hover:border-[#cda24a88]"
                  }`}
                >
                  <span>{item.label}</span>
                  {current ? (
                    <span className="hidden text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#8f8778] min-[360px]:inline">
                      Current
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
