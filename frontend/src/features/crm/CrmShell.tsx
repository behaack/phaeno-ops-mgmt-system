import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const sections = [
  { label: "Home", to: "/crm" },
  { label: "Companies", to: "/crm/companies" },
  { label: "Contacts", to: "/crm/contacts" },
  { label: "Leads", to: "/crm/leads" },
  { label: "Opportunities", to: "/crm/opportunities" },
  { label: "Tasks", to: "/crm/tasks" },
  { label: "Reports", to: "/crm/reports" },
  { label: "Administration", to: "/crm/administration" },
] as const;

export function CrmShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return (
    <div>
      <nav aria-label="CRM sections" className="border-b bg-card/60">
        <div className="page-wrap flex gap-1 overflow-x-auto px-4 py-2">
          {sections.map((section) => {
            const current =
              section.to === "/crm"
                ? pathname === section.to
                : pathname === section.to ||
                  pathname.startsWith(`${section.to}/`);
            return (
              <Link
                key={section.to}
                to={section.to}
                aria-current={current ? "page" : undefined}
                className={`shrink-0 cursor-pointer rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
