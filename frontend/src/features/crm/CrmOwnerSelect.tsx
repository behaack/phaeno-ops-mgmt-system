import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { listPhaenoUsers } from "#/api/organization-management";

export function CrmOwnerSelect({
  id,
  currentOwnerId,
  currentOwnerName,
  defaultLabel = "Assign to me",
  enabled = true,
}: {
  id: string;
  currentOwnerId?: string | null;
  currentOwnerName?: string | null;
  defaultLabel?: string;
  enabled?: boolean;
}) {
  const [value, setValue] = useState(currentOwnerId ?? "");
  useEffect(() => setValue(currentOwnerId ?? ""), [currentOwnerId]);
  const users = useQuery({
    queryKey: ["phaeno-users", "crm-owner-choices"],
    queryFn: listPhaenoUsers,
    enabled,
  });
  const activeUsers = (users.data ?? []).filter((user) => user.isActive);
  const currentIsMissing = Boolean(
    currentOwnerId && !activeUsers.some((user) => user.id === currentOwnerId),
  );
  return (
    <select
      id={id}
      name="ownerUserId"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className="h-9 w-full min-w-0 max-w-full rounded-md border bg-background px-3 text-sm"
    >
      <option value="">{defaultLabel}</option>
      {currentIsMissing ? (
        <option value={currentOwnerId ?? ""}>
          {currentOwnerName ?? "Current owner"} · unavailable
        </option>
      ) : null}
      {activeUsers.map((user) => (
        <option key={user.id} value={user.id}>
          {`${user.firstName} ${user.lastName}`.trim()} · {user.email}
        </option>
      ))}
    </select>
  );
}
