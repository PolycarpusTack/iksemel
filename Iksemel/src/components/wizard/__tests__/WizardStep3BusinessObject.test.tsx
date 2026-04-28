import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStep3BusinessObject } from "../WizardStep3BusinessObject";
import type { SchemaNode } from "@/types";

function makeNode(name: string, children: SchemaNode[] = []): SchemaNode {
  return {
    id: `n-${name}`,
    name,
    documentation: "",
    minOccurs: "0",
    maxOccurs: "unbounded",
    type: children.length > 0 ? "complex" : "simple",
    typeName: children.length > 0 ? "" : "string",
    children,
    isRequired: false,
  };
}

const SCHEMA: SchemaNode[] = [
  makeNode("Schedule", [
    makeNode("Programme", [makeNode("Title"), makeNode("StartTime")]),
    makeNode("Channel", [makeNode("Name")]),
  ]),
];

describe("WizardStep3BusinessObject", () => {
  it("renders top-level element candidates from schema children", () => {
    render(<WizardStep3BusinessObject schema={SCHEMA} selectedXPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Programme")).toBeInTheDocument();
    expect(screen.getByText("Channel")).toBeInTheDocument();
  });

  it("shows field count for each candidate", () => {
    render(<WizardStep3BusinessObject schema={SCHEMA} selectedXPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/2 fields/)).toBeInTheDocument();
  });

  it("clicking a candidate calls onSelect with //ElementName xpath", () => {
    const onSelect = vi.fn();
    render(<WizardStep3BusinessObject schema={SCHEMA} selectedXPath={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Programme/ }));
    expect(onSelect).toHaveBeenCalledWith("//Programme");
  });

  it("shows preview panel with child fields when candidate is selected", () => {
    render(<WizardStep3BusinessObject schema={SCHEMA} selectedXPath="//Programme" onSelect={vi.fn()} />);
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("StartTime")).toBeInTheDocument();
  });

  it("shows empty state when schema has no candidates", () => {
    render(<WizardStep3BusinessObject schema={[makeNode("Root", [])]} selectedXPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/No root elements found/)).toBeInTheDocument();
  });
});
