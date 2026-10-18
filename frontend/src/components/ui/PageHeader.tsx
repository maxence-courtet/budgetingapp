import { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  title: string;
  action?: ReactNode;
  /** A link back to the parent page, e.g. Settings for the set-up pages. */
  back?: { href: string; label: string };
}

export function PageHeader({ title, action, back }: Props) {
  return (
    <div className="mb-5 sm:mb-6">
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 -ml-1 mb-1 text-sm font-medium text-muted hover:text-fg"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-fg">{title}</h1>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
