import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClass =
  "amm-form-field text-base";

type BaseProps = {
  label: string;
  children?: ReactNode;
};

export function TextField({ label, ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = props["aria-describedby"];
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#f4ead4]">{label}</span>
      <input {...props} aria-describedby={describedBy} className={`${fieldClass} ${props.className || ""}`} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#f4ead4]">{label}</span>
      <select {...props} className={`${fieldClass} ${props.className || ""}`}>
        {children}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#f4ead4]">{label}</span>
      <textarea {...props} className={`${fieldClass} ${props.className || ""}`} />
    </label>
  );
}
