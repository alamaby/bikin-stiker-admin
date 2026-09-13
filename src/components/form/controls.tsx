import * as React from "react";
import { cn } from "@/lib/utils";
// TailAdmin-styled form primitives (free-nextjs-admin-dashboard, MIT License).
// Single source for labels/inputs/selects/textarea/checkbox used by filter bars
// and detail forms. Plain components (no "use client") so both RSC and client
// components can import them.

export const fieldLabelClass = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400";

export const inputClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 disabled:opacity-50";

export const textareaClass =
  "w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 font-mono text-xs text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 disabled:opacity-50";

export const checkboxClass =
  "h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 disabled:opacity-50";

export function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn(fieldLabelClass, className)} {...props} />;
}

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className, ...props }: TextInputProps) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export type SelectInputProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function SelectInput({ className, children, ...props }: SelectInputProps) {
  return (
    <select className={cn(inputClass, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, ...props }: TextAreaProps) {
  return <textarea className={cn(textareaClass, className)} {...props} />;
}

export type CheckBoxProps = React.InputHTMLAttributes<HTMLInputElement>;

export function CheckBox({ className, ...props }: CheckBoxProps) {
  return <input type="checkbox" className={cn(checkboxClass, className)} {...props} />;
}
