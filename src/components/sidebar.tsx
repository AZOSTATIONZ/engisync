"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavSections, isNavActive } from "@/components/nav-items";

export function Sidebar({ isSupervisor = false }: { isSupervisor?: boolean }) {
  const pathname = usePathname();
  const sections = getNavSections(isSupervisor);

  return (
    <aside className="hidden w-60 shrink-0 border-r md:block">
      <nav className="flex flex-col gap-4 p-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.description}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
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
