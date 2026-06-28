import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SectionEyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  tone?: "gold" | "slate" | "ruby" | "cyan";
}

export function SectionEyebrow({
  tone = "gold",
  className,
  children,
  ...props
}: SectionEyebrowProps) {
  return (
    <p
      className={cn(
        "text-xs font-semibold tracking-kicker uppercase",
        tone === "gold"  && "text-gold-400",
        tone === "slate" && "text-slate-400",
        tone === "ruby"  && "text-ruby-400",
        tone === "cyan"  && "text-cyan-400",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface SectionHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3";
  size?: "xl" | "lg" | "md" | "sm";
}

export function SectionHeading({
  as: Tag = "h2",
  size = "lg",
  className,
  children,
  ...props
}: SectionHeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display font-bold text-cream",
        size === "xl" && "text-6xl sm:text-7xl lg:text-8xl leading-[0.9]",
        size === "lg" && "text-5xl sm:text-6xl leading-tight",
        size === "md" && "text-4xl sm:text-5xl leading-tight",
        size === "sm" && "text-3xl sm:text-4xl leading-snug",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export interface SectionLeadProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "lg" | "md";
}

export function SectionLead({
  size = "md",
  className,
  children,
  ...props
}: SectionLeadProps) {
  return (
    <p
      className={cn(
        "leading-relaxed",
        size === "lg" && "text-xl text-slate-300 font-light",
        size === "md" && "text-lg text-slate-400",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  eyebrowTone?: SectionEyebrowProps["tone"];
  heading: React.ReactNode;
  headingSize?: SectionHeadingProps["size"];
  headingAs?: SectionHeadingProps["as"];
  lead?: React.ReactNode;
  center?: boolean;
}

export function SectionHeader({
  eyebrow,
  eyebrowTone = "gold",
  heading,
  headingSize = "lg",
  headingAs = "h2",
  lead,
  center = false,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-16",
        center && "text-center",
        className
      )}
      {...props}
    >
      {eyebrow && (
        <SectionEyebrow tone={eyebrowTone} className="mb-4">
          {eyebrow}
        </SectionEyebrow>
      )}
      <SectionHeading as={headingAs} size={headingSize}>
        {heading}
      </SectionHeading>
      {lead && (
        <SectionLead className={cn("mt-5", center && "max-w-md mx-auto")}>
          {lead}
        </SectionLead>
      )}
    </div>
  );
}
