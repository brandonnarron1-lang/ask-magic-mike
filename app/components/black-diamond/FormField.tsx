import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClass =
  "mt-2 w-full rounded-md border border-[#cda24a4a] bg-black/45 px-4 py-4 text-base text-[#f4ead4] outline-none transition placeholder:text-[#d9ceb87a] focus:border-[#22c6d2]";

type BaseProps = {
  label: string;
  children?: ReactNode;
};

export function TextField({ label, ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#f4ead4]">{label}</span>
      <input {...props} className={`${fieldClass} ${props.className || ""}`} />
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
