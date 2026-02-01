import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const inputBase =
  "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500";

const labelBase = "block text-sm font-medium text-gray-700";

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label className={labelBase} htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function Input({
  label,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <input className={`${label ? "mt-1 " : ""}${inputBase} ${className}`} {...props} />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <select className={`${label ? "mt-1 " : ""}${inputBase} ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Textarea({
  label,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <textarea className={`${label ? "mt-1 " : ""}${inputBase} ${className}`} {...props} />
    </div>
  );
}

export function FileInput({
  label,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <input
        type="file"
        className={`${label ? "mt-1 " : ""}block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 file:cursor-pointer hover:file:bg-blue-100 ${className}`}
        {...props}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
