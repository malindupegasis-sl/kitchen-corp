import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageShell({ title, description, children }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">{description}</p>
      </div>
      {children ?? (
        <div className="rounded-lg border border-dashed border-border bg-white/60 p-10 text-center text-sm text-muted">
          Nothing here yet.
        </div>
      )}
    </div>
  );
}
