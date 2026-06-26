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
      <h2 className="font-display text-[26px] sm:text-3xl font-semibold text-[#F7F1E8] mb-2 leading-tight">
        How should Mike reach you?
      </h2>
      <p className="text-[13.5px] text-slate-400 mb-7">
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
              className="block text-[10.5px] font-semibold text-slate-400 mb-2 uppercase tracking-[0.18em]"
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
                "text-[#F7F1E8] placeholder:text-slate-500 text-[14.5px]",
                "focus:outline-none transition-colors",
                phoneError && field.name === "phone"
                  ? "border-ruby-400/60 focus:border-ruby-400 focus:ring-2 focus:ring-ruby-400/[0.15]"
                  : "border-white/10 focus:border-gold-400/45 focus:ring-2 focus:ring-gold-400/15"
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
