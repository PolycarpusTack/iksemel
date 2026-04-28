import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { AppProvider } from "@/state";
import { WizardShell } from "../WizardShell";

function wrapper(props: { readonly children: ReactNode }) {
  return <AppProvider>{props.children}</AppProvider>;
}

function renderShell() {
  return render(<WizardShell />, { wrapper });
}

beforeEach(() => {
  localStorage.clear();
});

describe("WizardShell", () => {
  it("starts at step 1 by default", () => {
    renderShell();
    expect(screen.getByRole("radio", { name: /XSD Schema/ })).toBeInTheDocument();
  });

  it("Next button is disabled when no source selected on step 1", () => {
    renderShell();
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("Next button is enabled after selecting a source", () => {
    renderShell();
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    expect(screen.getByRole("button", { name: /Next/ })).not.toBeDisabled();
  });

  it("advances to step 2 after selecting source and clicking Next", () => {
    renderShell();
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText(/Upload your XSD schema/)).toBeInTheDocument();
  });

  it("Back button on step 2 returns to step 1", () => {
    renderShell();
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByRole("radio", { name: /XSD Schema/ })).toBeInTheDocument();
  });

  it("persists wizard progress to localStorage", () => {
    renderShell();
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    const stored = JSON.parse(localStorage.getItem("iksemel-wizard") ?? "{}") as { selectedSource?: string };
    expect(stored.selectedSource).toBe("xsd");
  });

  it("restores selectedSource from localStorage on mount", () => {
    localStorage.setItem("iksemel-wizard", JSON.stringify({ step: 1, selectedSource: "xml-sample" }));
    renderShell();
    expect(screen.getByRole("radio", { name: /XML Sample/ })).toHaveAttribute("aria-checked", "true");
  });
});
