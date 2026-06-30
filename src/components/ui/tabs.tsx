"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs subcomponents must be used inside <Tabs>");
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : internalValue;

  const handleChange = React.useCallback(
    (v: string) => {
      if (!isControlled) setInternalValue(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleChange }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "pills";
}

function TabsList({ className, variant = "default", ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center",
        variant === "default" && [
          "border-b border-white/[0.06]",
          "gap-0 overflow-x-auto scrollbar-none",
        ],
        variant === "pills" && [
          "gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1",
        ],
        className
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  variant?: "default" | "pills";
}

function TabsTrigger({ value, variant = "default", className, children, ...props }: TabsTriggerProps) {
  const ctx = useTabsContext();
  const isActive = ctx.value === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "relative shrink-0 font-semibold transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50",
        "disabled:opacity-50 disabled:cursor-not-allowed",

        variant === "default" && [
          "px-4 py-2.5 text-[11px] tracking-label uppercase whitespace-nowrap",
          isActive
            ? "text-gold-300 after:absolute after:bottom-0 after:inset-x-0 after:h-px after:bg-gold-400"
            : "text-slate-500 hover:text-slate-300",
        ],
        variant === "pills" && [
          "rounded-lg px-3 py-1.5 text-xs",
          isActive
            ? "bg-gold-400/[0.12] text-gold-300 border border-gold-400/20"
            : "text-slate-400 hover:text-slate-300 hover:bg-white/[0.04]",
        ],

        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const ctx = useTabsContext();
  if (ctx.value !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("animate-fade-in", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
