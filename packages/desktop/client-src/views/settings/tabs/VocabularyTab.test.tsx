import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { I18nextProvider } from "react-i18next";
import { VocabularyTab } from "./VocabularyTab";
import { theme } from "../../../theme/tokens";
import i18n from "../../../i18n";
import { addEntry, deleteEntry, getVocabulary, renameEntry } from "@tyvox/sdk/client";

vi.mock("@tyvox/sdk/client", () => ({
  addEntry: vi.fn(),
  clearVocabulary: vi.fn(),
  deleteEntry: vi.fn(),
  getVocabulary: vi.fn(),
  renameEntry: vi.fn(),
  resolveSessionId: vi.fn(() => "test-session"),
}));

const okResponse = (data: unknown) => ({ data, status: 200, headers: new Headers() });

const renderVocabularyTab = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <VocabularyTab />
      </ThemeProvider>
    </I18nextProvider>,
  );

describe("VocabularyTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    (getVocabulary as ReturnType<typeof vi.fn>).mockResolvedValue(
      okResponse({ vocabulary: { hello: 3, world: 1 } }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("displays vocabulary from the server", async () => {
    renderVocabularyTab();

    await waitFor(() => {
      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("world")).toBeInTheDocument();
    });
  });

  it("adds a vocabulary entry", async () => {
    (addEntry as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse(undefined));
    (getVocabulary as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okResponse({ vocabulary: { hello: 3 } }))
      .mockResolvedValueOnce(okResponse({ vocabulary: { hello: 3, newterm: 1 } }));

    renderVocabularyTab();

    await waitFor(() => {
      expect(screen.getByText("hello")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText("Proper Nouns");
    fireEvent.change(input, { target: { value: "newterm" } });

    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    });

    await waitFor(() => {
      expect(addEntry).toHaveBeenCalledWith("newterm");
      expect(screen.getByText("newterm")).toBeInTheDocument();
    });
    expect(input).toHaveValue("");
  });

  it("deletes a vocabulary entry after confirmation", async () => {
    (deleteEntry as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse(undefined));
    (getVocabulary as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okResponse({ vocabulary: { hello: 3 } }))
      .mockResolvedValueOnce(okResponse({ vocabulary: {} }));

    renderVocabularyTab();

    await waitFor(() => {
      expect(screen.getByText("hello")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: "Delete" });

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      expect(deleteEntry).toHaveBeenCalledWith("hello");
      expect(screen.queryByText("hello")).not.toBeInTheDocument();
    });
  });

  it("renames a vocabulary entry", async () => {
    (renameEntry as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse(undefined));
    (getVocabulary as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okResponse({ vocabulary: { hello: 3 } }))
      .mockResolvedValueOnce(okResponse({ vocabulary: { hi: 3 } }));

    renderVocabularyTab();

    await waitFor(() => {
      expect(screen.getByText("hello")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: "Edit" });

    await act(async () => {
      fireEvent.click(editButton);
    });

    const input = screen.getByDisplayValue("hello");
    fireEvent.change(input, { target: { value: "hi" } });

    const saveButton = screen.getByRole("button", { name: "Save" });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(renameEntry).toHaveBeenCalledWith("hello", { newEntry: "hi" });
      expect(screen.getByText("hi")).toBeInTheDocument();
      expect(screen.queryByText("hello")).not.toBeInTheDocument();
    });
  });
});
