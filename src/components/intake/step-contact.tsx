"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { normalizeToE164 } from "@/lib/utils/phone";

interface StepContactProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}

interface FieldConfig {
  name: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  testId?: string;
}

const FIELDS: FieldConfig[] = [
  {
    name: "firstName",
    label: "First Name",
    type: "text",
    placeholder: "Jane",
    required: true,
    autoComplete: "given-name",
    testId: "contact-first-name",
  },
  {
    name: "lastName",
    label: "Last Name",
    type: "text",
    placeholder: "Smith",
    autoComplete: "family-name",
    testId: "contact-last-name",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "jane@example.com",
    required: true,
    autoComplete: "email",
    testId: "contact-email",
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    placeholder: "(252) 555-1234",
    autoComplete: "tel",
    testId: "contact-phone",
  },
];

export function StepContact({
  firstName,
  lastName,
  email,
  phone,
  onChange,
  onNext,
}: StepContactProps) {
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const values: Record<string, string> = { firstName, lastName, email, phone };

  const canProceed = firstName.trim().length > 0 && email.trim().length > 0;

  const handlePhoneBlur = () => {
    if (!phone.trim()) {
      setPhoneError(null);
      return;
    }
    const normalized = normalizeToE164(phone);
    if (!normalized) {
      setPhoneError("Please enter a valid US phone number");
    } else {
      setPhoneError(null);
      onChange("phone", normalized);
    }
  };

  return (
    <div className="pt-2">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-cream mb-2 leading-snug">
        How should Mike reach you?
      </h2>
      <p className="text-sm text-slate-400 mb-7 leading-relaxed">
        Mike typically responds within a few hours. Your info is never sold or
        spammed — it goes straight to Our Town Properties.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-7">
        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={
              field.name === "email" || field.name === "phone"
                ? "col-span-2"
                : "col-span-1"
            }
          >
            <label
              htmlFor={`contact-${field.name}`}
              className="block text-[10.5px] font-semibold text-slate-400 mb-2 uppercase tracking-label"
            >
              {field.label}
              {field.required && (
                <span className="ml-1 text-gold-400">*</span>
              )}
            </label>
            <input
              id={`contact-${field.name}`}
              data-testid={field.testId}
              type={field.type}
              value={values[field.name]}
              autoComplete={field.autoComplete}
              onChange={(e) => onChange(field.name, e.target.value)}
              onBlur={field.name === "phone" ? handlePhoneBlur : undefined}
              placeholder={field.placeholder}
              className={cn(
                "w-full rounded-xl border bg-[#0B0E14]/85 px-4 py-3",
                "text-cream placeholder:text-slate-500 text-sm",
                "focus:outline-none transition-all duration-200",
                phoneError && field.name === "phone"
                  ? "border-ruby-400/60 focus:border-ruby-400/70 focus:ring-2 focus:ring-ruby-400/[0.12] focus:shadow-[0_0_20px_-4px_rgba(193,39,45,0.20)]"
                  : "border-white/[0.08] focus:border-gold-400/50 focus:ring-2 focus:ring-gold-400/[0.10] focus:shadow-[0_0_20px_-4px_rgba(212,160,23,0.18)]"
              )}
            />
            {field.name === "phone" && phoneError && (
              <p className="mt-1 text-xs text-ruby-400">{phoneError}</p>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={onNext}
        disabled={!canProceed}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
}
