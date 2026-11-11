import type { ReactNode } from "react";

export const DEFAULT_SOURCE = "Source: seller data, Kitchen Corp analysis";

type Props = {
  number: number;
  /** One-line takeaway, stated as a conclusion. */
  title: string;
  source?: string;
  actions?: ReactNode;
  /** Optional note under the title, e.g. how to read the exhibit. */
  note?: string;
  children: ReactNode;
};

/** Frame for charts and key tables: "Exhibit N", takeaway title, source line. */
export function Exhibit({ number, title, source = DEFAULT_SOURCE, actions, note, children }: Props) {
  return (
    <figure className="rounded-2xl bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.14)]">
      <figcaption className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Exhibit {number}</div>
          <h2 className="display mt-1.5 text-2xl leading-snug md:text-[28px]">{title}</h2>
          {note && <p className="mt-2 text-sm text-muted">{note}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </figcaption>
      {children}
      <div className="mt-4 text-xs text-muted">{source}</div>
    </figure>
  );
}
