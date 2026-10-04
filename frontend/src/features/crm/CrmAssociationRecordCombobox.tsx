import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";

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
  portal = false,
  onValueChange,
  onSearchChange,
  invalid = false,
  describedBy,
  initialValue,
  inputRef: externalInputRef,
}: {
  id: string;
  name: string;
  kind: SearchKind;
  excludedIds?: string[];
  required?: boolean;
  portal?: boolean;
  onValueChange?: (id: string) => void;
  onSearchChange?: (search: string) => void;
  invalid?: boolean;
  describedBy?: string;
  initialValue?: { id: string; label: string; description?: string | null };
  inputRef?: Ref<HTMLInputElement>;
}) {
  const generatedId = useId();
  const listboxId = `${id}-${generatedId}-results`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState(initialValue?.label ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<SearchOption | null>(initialValue ? { ...initialValue, description: initialValue.description ?? null } : null);
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

  const options = (results.isFetching || results.isError ? [] : results.data ?? []).filter(
    (option) => !excluded.has(option.id),
  );
  const activeOption = options[activeIndex];
  const recordLabel = kind === "company" ? "Company" : "Contact";
  const recordPlural = kind === "company" ? "companies" : "contacts";

  function choose(option: SearchOption) {
    setSelected(option);
    onValueChange?.(option.id);
    setSearch(option.label);
    setOpen(false);
    inputRef.current?.setCustomValidity("");
  }

  function dismissChoices(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    // Focus first: the input's focus handler opens choices, then this closes them.
    inputRef.current?.focus();
    setOpen(false);
  }

  useEffect(() => {
    if (portal && open && activeOption) {
      const list = listRef.current;
      const option = document.getElementById(`${listboxId}-${activeOption.id}`);
      if (list && option) {
        const top = option.offsetTop;
        if (top < list.scrollTop) list.scrollTop = top;
        else if (top + option.offsetHeight > list.scrollTop + list.clientHeight)
          list.scrollTop = top + option.offsetHeight - list.clientHeight;
      }
    }
  }, [portal, open, activeOption, listboxId]);

  function renderChoices() {
    return (results.isFetching ? (
      <p className="px-3 py-2 text-sm text-muted-foreground" role="status">
        Searching…
      </p>
    ) : results.isError ? (
      <div className="px-3 py-2 text-sm text-destructive" role="alert">
        <p>{recordLabel} search is unavailable.</p>
        <button type="button" className="mt-1 cursor-pointer underline" onMouseDown={event => event.preventDefault()} onClick={() => void results.refetch()}>Retry {recordLabel.toLowerCase()} search</button>
      </div>
    ) : options.length ? (
      options.map((option, index) => (
        <button
          key={option.id}
          id={`${listboxId}-${option.id}`}
          type="button"
          role="option"
          tabIndex={portal ? -1 : undefined}
          aria-selected={selected?.id === option.id}
          className={`w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${index === activeIndex ? "bg-accent text-accent-foreground" : ""}`}
          onMouseEnter={() => setActiveIndex(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(option)}
          onKeyDown={dismissChoices}
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
        No available {recordPlural} found.
      </p>
    ));
  }

  return (
    <Popover.Root open={portal && open} onOpenChange={setOpen}>
    <div
      className="relative"
      data-searchable-select-open={open || undefined}
      data-searchable-select-portal={portal && open || undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && !listRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Popover.Anchor asChild><div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={node => { inputRef.current = node; if (typeof externalInputRef === "function") externalInputRef(node); else if (externalInputRef) externalInputRef.current = node; }}
          id={id}
          value={search}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && activeOption ? `${listboxId}-${activeOption.id}` : undefined}
          autoComplete="off"
          className="pl-9"
          placeholder={`Search ${recordPlural}`}
          onFocus={() => { if (portal) inputRef.current?.scrollIntoView({ block: "nearest" }); setOpen(true); }}
          onChange={(event) => {
            setSearch(event.target.value);
            onSearchChange?.(event.target.value);
            setSelected(null);
            onValueChange?.("");
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
            } else dismissChoices(event);
          }}
        />
      </div></Popover.Anchor>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {open && portal ? (
        <Popover.Portal>
          <Popover.Content
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={`${recordLabel} search results`}
            data-searchable-select-open="true"
            align="start"
            sideOffset={4}
            collisionPadding={12}
            updatePositionStrategy="always"
            onOpenAutoFocus={event => event.preventDefault()}
            onCloseAutoFocus={event => event.preventDefault()}
            onInteractOutside={event => {
              if (event.target instanceof Node && inputRef.current?.contains(event.target)) event.preventDefault();
            }}
            onEscapeKeyDown={event => { event.preventDefault(); inputRef.current?.focus(); setOpen(false); }}
            className="relative z-[60] max-h-[min(15rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          >{renderChoices()}</Popover.Content>
        </Popover.Portal>
      ) : open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`${recordLabel} search results`}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {renderChoices()}
        </div>
      ) : null}
    </div>
    </Popover.Root>
  );
}
