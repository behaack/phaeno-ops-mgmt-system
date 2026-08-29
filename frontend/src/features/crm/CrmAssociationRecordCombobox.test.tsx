import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listCrmCompanies, listCrmContacts } from "#/api/crm";
import { Label } from "#/components/ui/label";
import { CrmAssociationRecordCombobox } from "./CrmAssociationRecordCombobox";

vi.mock("#/api/crm", () => ({
  listCrmCompanies: vi.fn(),
  listCrmContacts: vi.fn(),
}));

describe("CRM association record combobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("incrementally searches and selects a Company", async () => {
    vi.mocked(listCrmCompanies).mockImplementation(async ({ search }) => ({
      items: search
        ? [
            {
              id: "company-1",
              name: "Johns Hopkins University",
              domainName: "jhu.edu",
            },
          ]
        : [],
      page: 1,
      pageSize: 20,
      totalCount: search ? 1 : 0,
    }) as Awaited<ReturnType<typeof listCrmCompanies>>);

    renderSearch(
      <>
        <Label htmlFor="company-search">Company</Label>
        <CrmAssociationRecordCombobox
          id="company-search"
          name="companyId"
          kind="company"
          required
        />
      </>,
    );

    fireEvent.change(screen.getByLabelText("Company"), {
      target: { value: "Johns" },
    });
    await waitFor(() =>
      expect(listCrmCompanies).toHaveBeenCalledWith({
        search: "Johns",
        pageSize: 20,
      }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: /Johns Hopkins University/ }),
    );

    await waitFor(() =>
      expect(
        document.querySelector<HTMLInputElement>('input[name="companyId"]')
          ?.value,
      ).toBe("company-1"),
    );
  });

  it("incrementally searches and selects a Contact", async () => {
    vi.mocked(listCrmContacts).mockImplementation(async ({ search }) => ({
      items: search
        ? [
            {
              id: "contact-1",
              displayName: "Joe Blow",
              email: "joe@example.com",
            },
          ]
        : [],
      page: 1,
      pageSize: 20,
      totalCount: search ? 1 : 0,
    }) as Awaited<ReturnType<typeof listCrmContacts>>);

    renderSearch(
      <>
        <Label htmlFor="contact-search">Contact</Label>
        <CrmAssociationRecordCombobox
          id="contact-search"
          name="contactId"
          kind="contact"
          required
        />
      </>,
    );

    fireEvent.change(screen.getByLabelText("Contact"), {
      target: { value: "Joe" },
    });
    await waitFor(() =>
      expect(listCrmContacts).toHaveBeenCalledWith({
        search: "Joe",
        pageSize: 20,
      }),
    );
    fireEvent.click(await screen.findByRole("option", { name: /Joe Blow/ }));

    await waitFor(() =>
      expect(
        document.querySelector<HTMLInputElement>('input[name="contactId"]')
          ?.value,
      ).toBe("contact-1"),
    );
  });
});

function renderSearch(content: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{content}</QueryClientProvider>,
  );
}
