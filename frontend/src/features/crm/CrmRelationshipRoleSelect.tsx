import { NativeSelect } from '#/components/ui/native-select';

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
  value,
  onValueChange,
  onBlur,
}: {
  id: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
}) {
  const currentRole = value ?? defaultValue;
  const options =
    currentRole &&
    !relationshipRoleOptions.includes(
      currentRole as (typeof relationshipRoleOptions)[number],
    )
      ? [currentRole, ...relationshipRoleOptions]
      : relationshipRoleOptions;

  return (
    <NativeSelect
      id={id}
      name="role"
      defaultValue={value === undefined ? defaultValue : undefined}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      onBlur={onBlur}
    >
      <option value="">Not specified</option>
      {options.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </NativeSelect>
  );
}
