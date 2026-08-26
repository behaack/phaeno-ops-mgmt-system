import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  createCrmSavedView,
  exportCrm,
  listCrmSavedViews,
  type CrmRecordType,
} from "#/api/crm";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

type SavedFilter = Record<string, string | boolean>;

export function CrmSavedViewBar({
  recordType,
  currentFilter,
  onApply,
}: {
  recordType: CrmRecordType;
  currentFilter: SavedFilter;
  onApply: (filter: SavedFilter) => void;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [selection, setSelection] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const views = useQuery({
    queryKey: ["crm-saved-views", recordType],
    queryFn: () => listCrmSavedViews(recordType),
  });
  const create = useMutation({
    mutationFn: (name: string) =>
      createCrmSavedView({
        name,
        recordType,
        filterJson: JSON.stringify(currentFilter),
        isShared: shared,
      }),
    onSuccess: async (view) => {
      setOpen(false);
      setShared(false);
      setSelection(view.id);
      await client.invalidateQueries({
        queryKey: ["crm-saved-views", recordType],
      });
    },
  });
  const exportCurrent = useMutation({
    mutationFn: () => exportCrm(recordType, currentFilter),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `crm-${recordType.toLowerCase()}-view.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
  return (
    <>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
        <div className="grid min-w-52 gap-1.5">
          <Label htmlFor={`${recordType}-saved-view`}>Saved view</Label>
          <select
            id={`${recordType}-saved-view`}
            value={selection}
            onChange={(event) => {
              const id = event.target.value;
              setSelection(id);
              setApplyError(null);
              const view = views.data?.find((value) => value.id === id);
              if (!view) return;
              try {
                const filter = JSON.parse(view.filterJson) as unknown;
                if (!isSavedFilter(filter)) throw new Error();
                onApply(filter);
              } catch {
                setApplyError("This saved view is no longer valid.");
              }
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Current filters</option>
            {(views.data ?? []).map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
                {view.isShared ? " · Shared" : ""}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <BookmarkPlus data-icon="inline-start" />
          Save current view
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={exportCurrent.isPending}
          onClick={() => exportCurrent.mutate()}
        >
          {exportCurrent.isPending ? "Exporting…" : "Export current view"}
        </Button>
        {applyError ? (
          <p className="w-full text-sm text-destructive">{applyError}</p>
        ) : null}
        {exportCurrent.error ? (
          <p className="w-full text-sm text-destructive">
            {apiErrorMessage(exportCurrent.error)}
          </p>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate(
                String(
                  new FormData(event.currentTarget).get("name") ?? "",
                ).trim(),
              );
            }}
          >
            <DialogHeader>
              <DialogTitle>Save current view</DialogTitle>
              <DialogDescription>
                Reuse the filters currently applied to this{" "}
                {recordType.toLowerCase()} directory.
              </DialogDescription>
            </DialogHeader>
            {create.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {apiErrorMessage(create.error)}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor={`${recordType}-view-name`}>View name *</Label>
                <Input
                  id={`${recordType}-view-name`}
                  name="name"
                  required
                  maxLength={150}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${recordType}-view-shared`}
                  checked={shared}
                  onCheckedChange={(value) => setShared(value === true)}
                />
                <Label
                  htmlFor={`${recordType}-view-shared`}
                  className="cursor-pointer"
                >
                  Share with CRM staff
                </Label>
              </div>
            </div>
            <DialogFooter>
              <span className="mr-auto text-xs text-muted-foreground">
                * Required
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save view"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function isSavedFilter(value: unknown): value is SavedFilter {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
