import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { listCrmCompanies, listCrmContacts } from "#/api/crm";
import { Input } from "#/components/ui/input";

type SearchKind = "company" | "contact";
const emptyIds: string[] = [];

type SearchOption = {
  id: string;
  label: string;
  description: string | null;
};

export function CrmAssociationRecordCombobox({
  id,
  name,
  kind,
  excludedIds = emptyIds,
  required = false,
}: {
  id: string;
  name: string;
  kind: SearchKind;
  excludedIds?: string[];
  required?: boolean;
}) {
  const generatedId = useId();
  const listboxId = `${id}-${generatedId}-results`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<SearchOption | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const results = useQuery({
    queryKey: ["crm-association-search", kind, debouncedSearch],
    queryFn: async (): Promise<SearchOption[]> => {
      if (kind === "company") {
        const response = await listCrmCompanies({
          search: debouncedSearch || undefined,
          pageSize: 20,
        });
        return response.items.map((company) => ({
          id: company.id,
          label: company.name,
          description: company.domainName,
        }));
      }

      const response = await listCrmContacts({
        search: debouncedSearch || undefined,
        pageSize: 20,
      });
      return response.items.map((contact) => ({
        id: contact.id,
        label: contact.displayName,
        description: contact.email,
      }));
    },
    enabled: open,
    staleTime: 30_000,
  });

  const options = (results.data ?? []).filter(
    (option) => !excluded.has(option.id),
  );
  const activeOption = options[activeIndex];
  const recordLabel = kind === "company" ? "Company" : "Contact";
  const recordPlural = kind === "company" ? "companies" : "contacts";

  function choose(option: SearchOption) {
    setSelected(option);
    setSearch(option.label);
    setOpen(false);
    inputRef.current?.setCustomValidity("");
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          id={id}
          value={search}
          required={required}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && activeOption ? `${listboxId}-${activeOption.id}` : undefined}
          autoComplete="off"
          className="pl-9"
          placeholder={`Search ${recordPlural}`}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelected(null);
            setActiveIndex(0);
            setOpen(true);
            event.currentTarget.setCustomValidity(
              `Select a ${recordLabel} from the search results.`,
            );
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) =>
                Math.min(current + 1, Math.max(options.length - 1, 0)),
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && activeOption) {
              event.preventDefault();
              choose(activeOption);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`${recordLabel} search results`}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {results.isFetching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground" role="status">
              Searching…
            </p>
          ) : results.isError ? (
            <p className="px-3 py-2 text-sm text-destructive" role="alert">
              {recordLabel} search is unavailable. Try again.
            </p>
          ) : options.length ? (
            options.map((option, index) => (
              <button
                key={option.id}
                id={`${listboxId}-${option.id}`}
                type="button"
                role="option"
                aria-selected={selected?.id === option.id}
                className={`w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${index === activeIndex ? "bg-accent text-accent-foreground" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span className="block font-medium">{option.label}</span>
                {option.description ? (
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground" role="status">
              No available {recordLabel.toLowerCase()}s found.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
