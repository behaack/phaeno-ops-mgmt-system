import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiErrorMessage,
  listCrmCustomFields,
  listCrmCustomFieldValues,
  setCrmCustomFieldValue,
  type CrmCustomFieldDefinition,
  type CrmRecordType,
} from "#/api/crm";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

export function CrmCustomFields({
  recordType,
  recordId,
}: {
  recordType: CrmRecordType;
  recordId: string;
}) {
  const client = useQueryClient();
  const definitions = useQuery({
    queryKey: ["crm-custom-fields", recordType],
    queryFn: () => listCrmCustomFields(false, recordType),
  });
  const values = useQuery({
    queryKey: ["crm-custom-field-values", recordId],
    queryFn: () => listCrmCustomFieldValues(recordId),
  });
  const save = useMutation({
    mutationFn: setCrmCustomFieldValue,
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["crm-custom-field-values", recordId],
      });
    },
  });
  const byDefinition = new Map(
    (values.data ?? []).map((value) => [value.definitionId, value]),
  );
  const missingRequired = (definitions.data ?? []).filter((definition) => {
    if (!definition.isRequired) return false;
    const value = byDefinition.get(definition.id)?.valueJson;
    return value == null || value === "null" || value === '""';
  });
  if (!definitions.isLoading && !(definitions.data?.length ?? 0)) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom fields</CardTitle>
        <CardDescription>
          Additional {recordType.toLowerCase()} metadata configured by CRM
          administrators.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {missingRequired.length ? (
          <Alert variant="destructive" className="sm:col-span-2">
            <AlertTitle>Required CRM data is incomplete</AlertTitle>
            <AlertDescription>
              Complete {missingRequired.map((value) => value.name).join(", ")}.
              This record remains visible in data-quality warnings until every
              required value is saved.
            </AlertDescription>
          </Alert>
        ) : null}
        {(definitions.data ?? []).map((definition) => (
          <CustomField
            key={`${definition.id}:${byDefinition.get(definition.id)?.version ?? "new"}`}
            definition={definition}
            value={byDefinition.get(definition.id)}
            pending={save.isPending}
            onSave={(valueJson, version) =>
              save.mutate({
                definitionId: definition.id,
                recordId,
                valueJson,
                version,
              })
            }
          />
        ))}
        {save.error ? (
          <Alert variant="destructive" className="sm:col-span-2">
            <AlertDescription>{apiErrorMessage(save.error)}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CustomField({
  definition,
  value,
  pending,
  onSave,
}: {
  definition: CrmCustomFieldDefinition;
  value?: { valueJson: string; version: number };
  pending: boolean;
  onSave: (json: string, version?: number) => void;
}) {
  const id = `custom-${definition.id}`;
  const initial = parse(value?.valueJson);
  return (
    <form
      className="rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const raw = new FormData(event.currentTarget).get("value");
        const rawText = String(raw ?? "");
        const json =
          rawText === "" && !definition.isRequired
            ? "null"
            : definition.dataType === "Number"
              ? String(Number(rawText))
              : definition.dataType === "Boolean"
                ? String(rawText === "true")
                : JSON.stringify(rawText);
        onSave(json, value?.version);
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Label htmlFor={id}>
          {definition.name}
          {definition.isRequired ? " *" : ""}
        </Label>
        {definition.sensitivity === "Restricted" ? (
          <Badge variant="outline">Restricted</Badge>
        ) : null}
      </div>
      {definition.dataType === "Boolean" ? (
        <select
          id={id}
          name="value"
          required={definition.isRequired}
          defaultValue={initial == null ? "" : String(initial)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Not set</option>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      ) : definition.dataType === "Option" ? (
        <select
          id={id}
          name="value"
          required={definition.isRequired}
          defaultValue={String(initial ?? "")}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Select</option>
          {options(definition.optionsJson).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          name="value"
          type={
            definition.dataType === "Number"
              ? "number"
              : definition.dataType === "Date"
                ? "date"
                : "text"
          }
          step={definition.dataType === "Number" ? "any" : undefined}
          required={definition.isRequired}
          defaultValue={String(initial ?? "")}
        />
      )}
      <Button
        className="mt-2"
        size="sm"
        variant="outline"
        type="submit"
        disabled={pending}
      >
        Save
      </Button>
      {definition.isRequired ? (
        <p className="mt-2 text-xs text-muted-foreground">* Required</p>
      ) : null}
    </form>
  );
}
function parse(json?: string) {
  if (!json) return "";
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return "";
  }
}
function options(json: string | null) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
