"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const fieldClass =
  "amm-form-field text-base";

type BaseProps = {
  label: string;
  children?: ReactNode;
};

function FieldLabel({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-[#f4ead4]">
        {label}
      </label>
      {required ? (
        <span aria-hidden="true" className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b7aa94]">
          Required
        </span>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  inputRef,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement> & { inputRef?: Ref<HTMLInputElement> }) {
  const generatedId = useId();
  const fieldId = props.id || generatedId;
  const describedBy = props["aria-describedby"];
  return (
    <div className="block">
      <FieldLabel htmlFor={fieldId} label={label} required={props.required} />
      <input ref={inputRef} {...props} id={fieldId} aria-describedby={describedBy} className={`${fieldClass} ${props.className || ""}`} />
    </div>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const fieldId = props.id || generatedId;
  return (
    <div className="block">
      <FieldLabel htmlFor={fieldId} label={label} required={props.required} />
      <select {...props} id={fieldId} className={`${fieldClass} ${props.className || ""}`}>
        {children}
      </select>
    </div>
  );
}

export function TextAreaField({
  label,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const fieldId = props.id || generatedId;
  return (
    <div className="block">
      <FieldLabel htmlFor={fieldId} label={label} required={props.required} />
      <textarea {...props} id={fieldId} className={`${fieldClass} ${props.className || ""}`} />
    </div>
  );
}
