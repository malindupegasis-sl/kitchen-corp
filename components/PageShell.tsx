import type { ReactNode } from "react";

type Props = {
  /** Small plain label above the title, e.g. "Pipeline". */
  label: string;
  /** Action title: states the conclusion. */
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageHeading({ label, title, description, actions }: Omit<Props, "children">) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-3xl">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</div>
        <h1 className="display mt-2 text-4xl leading-[1.08] md:text-5xl">{title}</h1>
        {description && <p className="mt-4 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageShell({ label, title, description, actions, children }: Props) {
  return (
    <div className="space-y-10">
      <PageHeading label={label} title={title} description={description} actions={actions} />
      {children ?? (
        <div className="rounded-2xl bg-surface p-14 text-center text-sm text-muted">
          Nothing here yet.
        </div>
      )}
    </div>
  );
}
