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
}

const FIELDS: FieldConfig[] = [
  {
    name: "firstName",
    label: "First Name",
    type: "text",
    placeholder: "Jane",
    required: true,
    autoComplete: "given-name",
  },
  {
    name: "lastName",
    label: "Last Name",
    type: "text",
    placeholder: "Smith",
    autoComplete: "family-name",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "jane@example.com",
    required: true,
    autoComplete: "email",
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    placeholder: "(352) 555-1234",
    autoComplete: "tel",
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
    <div className="pt-8">
      <h2 className="font-display text-3xl font-semibold text-cream mb-2">
        How should Mike reach you?
      </h2>
      <p className="text-slate-400 mb-8">
        Mike typically responds within minutes. Your info is never sold or spammed.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {FIELDS.map((field) => (
          <div
            key={field.name}
            className={
              field.name === "email" || field.name === "phone"
                ? "col-span-2"
                : "col-span-1"
            }
          >
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              {field.label}
              {field.required && (
                <span className="ml-1 text-gold-400">*</span>
              )}
            </label>
            <input
              type={field.type}
              value={values[field.name]}
              autoComplete={field.autoComplete}
              onChange={(e) => onChange(field.name, e.target.value)}
              onBlur={field.name === "phone" ? handlePhoneBlur : undefined}
              placeholder={field.placeholder}
              className={cn(
                "w-full rounded-xl border bg-white/5 px-4 py-3",
                "text-cream placeholder:text-slate-500 text-sm",
                "focus:outline-none transition-colors",
                phoneError && field.name === "phone"
                  ? "border-red-500 focus:border-red-400"
                  : "border-white/10 focus:border-gold-400/40"
              )}
            />
            {field.name === "phone" && phoneError && (
              <p className="mt-1 text-xs text-red-400">{phoneError}</p>
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
