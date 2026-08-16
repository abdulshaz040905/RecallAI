"use client";

import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Action, Wordmark } from "./parts";
import { SignOutButton } from "../sign-out-button";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
];

export default function SiteNav() {
  const { isSignedIn } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Passive listener + a single boolean flip: no work per scroll frame
  // beyond one comparison.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lenis has to be told to stop, or the page scrolls behind the open menu.
  useEffect(() => {
    const lenis = (
      window as unknown as { lenis?: { start(): void; stop(): void } }
    ).lenis;
    if (!lenis) return;
    if (menuOpen) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-500 ${
        scrolled
          ? "border-line bg-paper/85 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Wordmark />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="link-underline font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <>
              <SignOutButton appearance="link" />
              <Action href="/home">Dashboard</Action>
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="link-underline cursor-pointer px-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <span>
                  <Action>Get started</Action>
                </span>
              </SignUpButton>
            </>
          )}
        </div>

        {/* Three-line menu toggle that folds into an X. */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-[5px] md:hidden"
        >
          <span
            className={`h-px w-5 bg-ink transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              menuOpen ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-px w-5 bg-ink transition-opacity duration-200 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-px w-5 bg-ink transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              menuOpen ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile sheet — height transition keeps it off the layout path. */}
      <div
        className={`overflow-hidden border-t border-line bg-paper transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block border-b border-line py-3.5 font-display text-xl tracking-[-0.03em] last:border-0"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-5">
            {isSignedIn ? (
              <Action href="/home" size="lg" className="w-full">
                Dashboard
              </Action>
            ) : (
              <SignUpButton mode="modal">
                <span className="block">
                  <Action size="lg" className="w-full">
                    Get started
                  </Action>
                </span>
              </SignUpButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
