import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
  keywords?: string[];
};

export function MultiSelect({
  id,
  options,
  values,
  onValuesChange,
  placeholder,
  emptyMessage,
  disabled = false,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  className,
}: {
  id: string;
  options: MultiSelectOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder: string;
  emptyMessage: string;
  disabled?: boolean;
  "aria-label": string;
  "aria-describedby"?: string;
  className?: string;
}) {
  const generatedId = useId();
  const listboxId = `${id}-${generatedId}-options`;
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(
    () =>
      options.filter((option) =>
        [option.label, ...(option.keywords ?? [])].some((candidate) =>
          candidate.toLocaleLowerCase().includes(normalizedSearch),
        ),
      ),
    [normalizedSearch, options],
  );
  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} services selected`;

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function toggle(option: MultiSelectOption) {
    onValuesChange(
      values.includes(option.value)
        ? values.filter((value) => value !== option.value)
        : [...values, option.value],
    );
    setSearch("");
    setActiveIndex(0);
    searchRef.current?.focus();
  }

  function close() {
    setOpen(false);
    setSearch("");
    setActiveIndex(0);
  }

  return (
    <div
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <Button
        ref={triggerRef}
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        className="w-full justify-between px-3 font-normal"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span
          className={cn(
            "truncate text-left",
            selectedLabels.length === 0 && "text-muted-foreground",
          )}
        >
          {summary}
        </span>
        <ChevronDown aria-hidden="true" className="shrink-0 opacity-60" />
      </Button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="relative p-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={searchRef}
              value={search}
              role="searchbox"
              aria-label={`Search ${ariaLabel.toLocaleLowerCase()}`}
              className="pl-8"
              placeholder="Search services"
              autoComplete="off"
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((current) =>
                    Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((current) => Math.max(current - 1, 0));
                } else if (event.key === "Enter" && filteredOptions[activeIndex]) {
                  event.preventDefault();
                  toggle(filteredOptions[activeIndex]);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  close();
                  triggerRef.current?.focus();
                }
              }}
            />
          </div>
          <div
            id={listboxId}
            role="listbox"
            aria-label={`${ariaLabel} options`}
            aria-multiselectable="true"
            className="max-h-60 overflow-y-auto p-1"
          >
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => {
                const selected = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      index === activeIndex && "bg-accent text-accent-foreground",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => toggle(option)}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-sm border">
                      {selected ? <Check aria-hidden="true" className="size-3" /> : null}
                    </span>
                    {option.label}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground" role="status">
                {emptyMessage}
              </p>
            )}
          </div>
          <div className="flex justify-end border-t p-1">
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
