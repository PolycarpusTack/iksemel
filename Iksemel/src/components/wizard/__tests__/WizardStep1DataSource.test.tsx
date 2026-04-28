import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStep1DataSource } from "../WizardStep1DataSource";

describe("WizardStep1DataSource", () => {
  it("renders both source options", () => {
    render(<WizardStep1DataSource selectedSource={null} onSelect={vi.fn()} />);
    expect(screen.getByText("XSD Schema")).toBeInTheDocument();
    expect(screen.getByText("XML Sample")).toBeInTheDocument();
  });

  it("calls onSelect with xsd when XSD card is clicked", () => {
    const onSelect = vi.fn();
    render(<WizardStep1DataSource selectedSource={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: /XSD Schema/ }));
    expect(onSelect).toHaveBeenCalledWith("xsd");
  });

  it("calls onSelect with xml-sample when XML card is clicked", () => {
    const onSelect = vi.fn();
    render(<WizardStep1DataSource selectedSource={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: /XML Sample/ }));
    expect(onSelect).toHaveBeenCalledWith("xml-sample");
  });

  it("marks selected card with aria-checked=true", () => {
    render(<WizardStep1DataSource selectedSource="xsd" onSelect={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /XSD Schema/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /XML Sample/ })).toHaveAttribute("aria-checked", "false");
  });

  it("ArrowDown moves focus from XSD card to XML Sample card", () => {
    render(<WizardStep1DataSource selectedSource={null} onSelect={vi.fn()} />);
    const xsdCard = screen.getByRole("radio", { name: /XSD Schema/ });
    xsdCard.focus();
    fireEvent.keyDown(xsdCard, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: /XML Sample/ }));
  });

  it("ArrowUp wraps to last card from first card", () => {
    render(<WizardStep1DataSource selectedSource={null} onSelect={vi.fn()} />);
    const xsdCard = screen.getByRole("radio", { name: /XSD Schema/ });
    xsdCard.focus();
    fireEvent.keyDown(xsdCard, { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: /XML Sample/ }));
  });
});
