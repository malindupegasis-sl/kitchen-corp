"use client";

import { useState, type ReactNode } from "react";
import { parseList } from "@/lib/format";

/* Draft-and-commit inputs: they show the committed value until focused,
   hold a local draft while editing, and commit on blur or Enter. Escape reverts. */

const base =
  "rounded-lg border border-transparent bg-fill px-3 py-2 text-sm outline-none transition-colors " +
  "hover:bg-black/[0.06] focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20";
const cell =
  "rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none transition-colors " +
  "hover:bg-fill focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20";

export function inputClass(variant: "field" | "cell" = "field"): string {
  return variant === "cell" ? cell : base;
}

function keyHandlers(revert: () => void) {
  return (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !(e.currentTarget instanceof HTMLTextAreaElement)) {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      revert();
      e.currentTarget.blur();
    }
  };
}

interface NumberInputProps {
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  /** Allow clearing the value. Default false: an empty cell reverts. */
  allowEmpty?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  /** Display with thousands separators when not editing. */
  thousands?: boolean;
  variant?: "field" | "cell";
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
}

export function NumberInput({
  value,
  onCommit,
  allowEmpty = false,
  min,
  max,
  integer,
  thousands,
  variant = "field",
  className = "",
  placeholder,
  id,
  ...rest
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const display =
    value === undefined
      ? ""
      : thousands
        ? value.toLocaleString("en-GB", { maximumFractionDigits: 2 })
        : String(value);
  const shown = draft ?? display;

  const commit = () => {
    if (draft === null) return;
    const text = draft.replace(/[£,%\s]/g, "");
    setDraft(null);
    if (text === "") {
      if (allowEmpty) onCommit(undefined);
      return;
    }
    const n = Number(text);
    if (!Number.isFinite(n)) return;
    if (integer && !Number.isInteger(n)) return;
    if (min !== undefined && n < min) return;
    if (max !== undefined && n > max) return;
    if (n !== value) onCommit(n);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      className={`${inputClass(variant)} num text-right ${className}`}
      value={shown}
      placeholder={placeholder}
      onFocus={() => setDraft(value === undefined ? "" : String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={keyHandlers(() => setDraft(null))}
      aria-label={rest["aria-label"]}
    />
  );
}

interface TextInputProps {
  value: string;
  onCommit: (value: string) => void;
  variant?: "field" | "cell";
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
}

export function TextInput({ value, onCommit, variant = "field", className = "", placeholder, id, ...rest }: TextInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    setDraft(null);
    if (next !== value) onCommit(next);
  };
  return (
    <input
      id={id}
      type="text"
      className={`${inputClass(variant)} ${className}`}
      value={draft ?? value}
      placeholder={placeholder}
      onFocus={() => setDraft(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={keyHandlers(() => setDraft(null))}
      aria-label={rest["aria-label"]}
    />
  );
}

interface ListInputProps {
  value: string[];
  onCommit: (value: string[]) => void;
  variant?: "field" | "cell";
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
}

/** Comma-separated list editor. */
export function ListInput({ value, onCommit, variant = "field", className = "", placeholder, id, ...rest }: ListInputProps) {
  const joined = value.join(", ");
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const next = parseList(draft);
    setDraft(null);
    if (next.join("\u0000") !== value.join("\u0000")) onCommit(next);
  };
  return (
    <input
      id={id}
      type="text"
      className={`${inputClass(variant)} ${className}`}
      value={draft ?? joined}
      placeholder={placeholder ?? "Comma-separated"}
      onFocus={() => setDraft(joined)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={keyHandlers(() => setDraft(null))}
      aria-label={rest["aria-label"]}
    />
  );
}

interface SelectInputProps<T extends string> {
  value: T | undefined;
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
  onChange: (value: T) => void;
  allowEmpty?: boolean;
  variant?: "field" | "cell";
  className?: string;
  "aria-label"?: string;
  id?: string;
}

export function SelectInput<T extends string>({
  value,
  options,
  labels,
  onChange,
  allowEmpty,
  variant = "field",
  className = "",
  id,
  ...rest
}: SelectInputProps<T>) {
  return (
    <select
      id={id}
      className={`${inputClass(variant)} ${className}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value as T)}
      aria-label={rest["aria-label"]}
    >
      {allowEmpty && <option value="">—</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  "aria-label": string;
}

export function Segmented<T extends string>({ value, options, onChange, ...rest }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={rest["aria-label"]} className="inline-flex rounded-full bg-fill p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={
              "rounded-full px-3.5 py-1 text-sm transition-colors " +
              (active ? "bg-foreground text-white shadow-sm" : "text-muted hover:text-foreground")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
}

/** Pill buttons. Primary is black with white text; nothing here uses green/amber/red. */
export function Button({ children, onClick, variant = "secondary", type = "button", disabled, className = "", title }: ButtonProps) {
  const styles: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-foreground text-white hover:bg-black/80 border-transparent",
    secondary: "bg-surface text-foreground hover:bg-fill border-line",
    ghost: "bg-transparent text-muted hover:text-foreground hover:bg-fill border-transparent",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

type CardProps = {
  /** Small plain label above the title, e.g. "Acquirer". */
  label?: string;
  /** Action title stating the conclusion. */
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Quiet white card: rounded, no border, no shadow. */
export function Card({ label, title, actions, children, className = "" }: CardProps) {
  return (
    <section className={`rounded-2xl bg-surface p-6 ${className}`}>
      {(label || title || actions) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            {label && <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</div>}
            {title && <h2 className="display mt-1.5 text-2xl leading-snug md:text-[28px]">{title}</h2>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function CuisineTag({ cuisine }: { cuisine: string }) {
  const text = cuisine.trim();
  return (
    <span
      className={
        "inline-flex max-w-32 items-center truncate rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide " +
        (text ? "bg-foreground/[0.07] text-foreground/80" : "border border-dashed border-line text-muted")
      }
      title={text || "No cuisine set"}
    >
      {text || "cuisine"}
    </span>
  );
}
