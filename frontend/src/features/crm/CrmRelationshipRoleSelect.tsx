const relationshipRoleOptions = [
  "Decision maker",
  "Scientific lead",
  "Procurement",
  "Executive sponsor",
  "Champion",
  "Influencer",
  "Technical evaluator",
  "Other",
] as const;

export function CrmRelationshipRoleSelect({
  id,
  defaultValue = "",
}: {
  id: string;
  defaultValue?: string;
}) {
  const options =
    defaultValue &&
    !relationshipRoleOptions.includes(
      defaultValue as (typeof relationshipRoleOptions)[number],
    )
      ? [defaultValue, ...relationshipRoleOptions]
      : relationshipRoleOptions;

  return (
    <select
      id={id}
      name="role"
      defaultValue={defaultValue}
      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
    >
      <option value="">Not specified</option>
      {options.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
  );
}
