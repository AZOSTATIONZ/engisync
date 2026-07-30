import { cn } from "@/lib/utils";

/**
 * The top of every page.
 *
 * WHY A COMPONENT AND NOT JUST A CLASS
 * The `.page-title` utility fixes the size; this fixes the STRUCTURE. Pages had
 * invented their own arrangements — some put actions beside the title, some
 * below, some wrapped the whole thing in a flex row with different gaps — so
 * even at a matching font size the pages did not line up with each other.
 *
 * Everything is optional except the title, and the actions slot is what stops
 * the next page from inventing its own header row to fit a button in.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Small label above the title — context, breadcrumb, or department. */
  eyebrow?: React.ReactNode;
  /** Buttons or links, right-aligned on wide screens, wrapped below on narrow. */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-sub">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
