import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";

import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

const visibleResultLimit = 50;

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string[];
};

export function SearchableSelect({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  emptyMessage,
  resultsLabel = "Customer search results",
  selectionMessage = "Select a Customer from the search results.",
  noMatchMessage = "No matching eligible Customers.",
  narrowMessage = (count: number) => `Keep typing to narrow ${count} eligible Customers.`,
  disabled = false,
  required = false,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  inputRef: externalInputRef,
  className,
}: {
  id: string;
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  emptyMessage: string;
  resultsLabel?: string;
  selectionMessage?: string;
  noMatchMessage?: string;
  narrowMessage?: (count: number) => string;
  disabled?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}) {
  const generatedId = useId();
  const listboxId = `${id}-${generatedId}-results`;
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const [search, setSearch] = useState(selectedOption?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(
    () =>
      options.filter((option) => {
        if (!normalizedSearch) return true;
        return [option.label, ...(option.keywords ?? [])].some((candidate) =>
          candidate.toLocaleLowerCase().includes(normalizedSearch),
        );
      }),
    [normalizedSearch, options],
  );
  const visibleOptions = filteredOptions.slice(0, visibleResultLimit);
  const activeOption = visibleOptions[activeIndex];

  useEffect(() => {
    if (selectedOption) setSearch(selectedOption.label);
    else if (!open) setSearch("");
  }, [open, selectedOption]);

  function choose(option: SearchableSelectOption) {
    setSearch(option.label);
    setOpen(false);
    onValueChange(option.value);
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

  return (
    <div
      className={cn("relative", className)}
      data-searchable-select-open={open || undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={(element) => {
            inputRef.current = element;
            if (typeof externalInputRef === "function") externalInputRef(element);
            else if (externalInputRef) externalInputRef.current = element;
          }}
          id={id}
          value={search}
          disabled={disabled}
          required={required}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-activedescendant={
            open && activeOption
              ? `${listboxId}-${activeOption.value}`
              : undefined
          }
          autoComplete="off"
          className="pl-9"
          placeholder={placeholder}
          onFocus={() => {
            if (disabled) return;
            setActiveIndex(0);
            setOpen(true);
          }}
          onChange={(event) => {
            setSearch(event.target.value);
            setActiveIndex(0);
            setOpen(true);
            onValueChange("");
            event.currentTarget.setCustomValidity(
              selectionMessage,
            );
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) =>
                Math.min(current + 1, Math.max(visibleOptions.length - 1, 0)),
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
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={resultsLabel}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {visibleOptions.length ? (
            <>
              {visibleOptions.map((option, index) => (
                <button
                  key={option.value}
                  id={`${listboxId}-${option.value}`}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  className={cn(
                    "w-full cursor-pointer rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    index === activeIndex &&
                      "bg-accent text-accent-foreground",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  onKeyDown={dismissChoices}
                >
                  {option.label}
                </button>
              ))}
              {filteredOptions.length > visibleOptions.length ? (
                <p
                  className="border-t px-3 py-2 text-xs text-muted-foreground"
                  role="status"
                >
                  {narrowMessage(filteredOptions.length)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground" role="status">
              {options.length ? noMatchMessage : emptyMessage}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
