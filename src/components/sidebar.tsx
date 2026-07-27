"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavSections, isNavActive } from "@/components/nav-items";

export function Sidebar({ isSupervisor = false }: { isSupervisor?: boolean }) {
  const pathname = usePathname();
  const sections = getNavSections(isSupervisor);

  return (
    <aside className="hidden w-60 shrink-0 border-r md:block lg:w-64 xl:w-72">
      <nav className="flex flex-col gap-4 p-4 lg:gap-5 lg:p-5">
        {sections.map((section) => (
          <div key={section.title || "primary"} className="flex flex-col gap-1">
            {/* Primary group is unlabelled — a heading over the five main
                destinations adds noise without adding meaning. */}
            {section.title && (
              <p className="px-3 pb-1 pt-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const secondary = Boolean(section.title);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.description}
                  className={cn(
                    "flex items-center gap-3 rounded-md transition-colors",
                    secondary
                      ? "px-3 py-1.5 text-[0.83rem] lg:gap-3 lg:px-3.5 lg:py-2 lg:text-sm"
                      : "px-3 py-2 text-sm font-medium lg:gap-3.5 lg:px-3.5 lg:py-2.5 lg:text-[0.95rem]",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "shrink-0",
                      secondary ? "h-4 w-4" : "h-4 w-4 lg:h-[1.15rem] lg:w-[1.15rem]",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
