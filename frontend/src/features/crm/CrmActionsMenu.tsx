import { ChevronDown } from "lucide-react";
import { useRef } from "react";
import { Button } from "#/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";

type CrmAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
  title?: string;
};

export function CrmActionsMenu({ label, items }: { label: string; items: (CrmAction | false)[] }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedAction = useRef<(() => void) | null>(null);
  const actions = items.filter((item): item is CrmAction => Boolean(item));
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={trigger} size="sm" variant="outline" aria-label={label}>
          Actions <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={(event) => {
        // Restore the persistent trigger before opening a dialog, so its own
        // focus restoration never targets an unmounted menu item.
        event.preventDefault();
        trigger.current?.focus();
        const action = selectedAction.current;
        selectedAction.current = null;
        action?.();
      }}>
        {actions.map(action => (
          <DropdownMenuItem key={action.label} disabled={action.disabled}
            variant={action.destructive ? "destructive" : "default"}
            title={action.title} onSelect={() => { selectedAction.current = action.onSelect; }}>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
