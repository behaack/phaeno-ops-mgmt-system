import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listCrmCompanies, listCrmContacts } from "#/api/crm";
import { Label } from "#/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "#/components/ui/dialog";
import { CrmAssociationRecordCombobox } from "./CrmAssociationRecordCombobox";

vi.mock("#/api/crm", () => ({
  listCrmCompanies: vi.fn(),
  listCrmContacts: vi.fn(),
}));

describe("CRM association record combobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes empty contact choices before dismissing the association dialog", async () => {
    vi.mocked(listCrmContacts).mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 });
    const onOpenChange = vi.fn();
    const onEscapeKeyDown = vi.fn();
    renderSearch(<Dialog open onOpenChange={onOpenChange}><DialogContent onEscapeKeyDown={onEscapeKeyDown}>
      <DialogTitle>Associate contact</DialogTitle><DialogDescription>Choose a Contact for this Company.</DialogDescription>
      <Label htmlFor="empty-contact">Contact</Label>
      <CrmAssociationRecordCombobox id="empty-contact" name="contactId" kind="contact" required />
    </DialogContent></Dialog>);
    const input = screen.getByRole("combobox", { name: "Contact" });
    act(() => input.focus());
    await screen.findByText("No available contacts found.");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(onOpenChange).not.toHaveBeenCalled(); expect(onEscapeKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onEscapeKeyDown).toHaveBeenCalledOnce(); expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the chosen Contact when Escape moves option focus back to the input", async () => {
    vi.mocked(listCrmContacts).mockResolvedValue({ items: [
      { id: "contact-1", displayName: "Ada Example", email: "ada@example.test" },
      { id: "contact-2", displayName: "Grace Example", email: "grace@example.test" },
    ], page: 1, pageSize: 20, totalCount: 2 } as Awaited<ReturnType<typeof listCrmContacts>>);
    const onOpenChange = vi.fn();
    renderSearch(<Dialog open onOpenChange={onOpenChange}><DialogContent>
      <DialogTitle>Associate contact</DialogTitle><DialogDescription>Choose a Contact for this Company.</DialogDescription>
      <Label htmlFor="selected-contact">Contact</Label>
      <CrmAssociationRecordCombobox id="selected-contact" name="contactId" kind="contact" required />
    </DialogContent></Dialog>);
    const input = screen.getByRole("combobox", { name: "Contact" }) as HTMLInputElement;
    act(() => input.focus()); await screen.findByRole("option", { name: /Ada Example/ });
    fireEvent.keyDown(input, { key: "ArrowDown" }); fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("Grace Example");
    expect(document.querySelector<HTMLInputElement>('input[name="contactId"]')?.value).toBe("contact-2");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const option = await screen.findByRole("option", { name: /Grace Example/ });
    act(() => option.focus()); expect(document.activeElement).toBe(option);
    fireEvent.keyDown(option, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull(); expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-expanded")).toBe("false"); expect(input.value).toBe("Grace Example");
    expect(document.querySelector<HTMLInputElement>('input[name="contactId"]')?.value).toBe("contact-2");
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" }); expect(onOpenChange).toHaveBeenCalledWith(false);
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
