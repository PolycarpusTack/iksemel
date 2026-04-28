import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStep2LoadData } from "../WizardStep2LoadData";

vi.mock("@components/shared", () => ({
  SchemaUpload: ({ onSchemaLoad }: { onSchemaLoad: (text: string) => void }) => (
    <button onClick={() => onSchemaLoad("<root><item/></root>")}>Upload</button>
  ),
}));

vi.mock("@engine/parser", () => ({
  parseXSD: vi.fn(() => ({
    roots: [
      {
        id: "n0",
        name: "Root",
        children: [],
        type: "complex",
        typeName: "",
        documentation: "",
        minOccurs: "1",
        maxOccurs: "1",
        isRequired: true,
      },
    ],
    warnings: [],
    nodeCount: 1,
  })),
  parseXmlSample: vi.fn(() => ({
    roots: [
      {
        id: "n0",
        name: "Root",
        children: [],
        type: "complex",
        typeName: "",
        documentation: "",
        minOccurs: "0",
        maxOccurs: "unbounded",
        isRequired: false,
      },
    ],
    warnings: [],
    nodeCount: 1,
  })),
}));

describe("WizardStep2LoadData", () => {
  it("renders the SchemaUpload component", () => {
    render(<WizardStep2LoadData source="xsd" onLoaded={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("calls parseXSD for xsd source and fires onLoaded with roots", async () => {
    const { parseXSD } = await import("@engine/parser");
    const onLoaded = vi.fn();
    render(<WizardStep2LoadData source="xsd" onLoaded={onLoaded} />);
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(parseXSD).toHaveBeenCalled();
    expect(onLoaded).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "Root" })]),
      [],
    );
  });

  it("calls parseXmlSample for xml-sample source", async () => {
    const { parseXmlSample } = await import("@engine/parser");
    const onLoaded = vi.fn();
    render(<WizardStep2LoadData source="xml-sample" onLoaded={onLoaded} />);
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(parseXmlSample).toHaveBeenCalled();
  });

  it("shows parse error inline when parse returns warnings", async () => {
    const { parseXSD } = await import("@engine/parser");
    vi.mocked(parseXSD).mockReturnValueOnce({
      roots: [],
      warnings: [{ message: "Bad schema", location: "", severity: "error" }],
      nodeCount: 0,
    });
    render(<WizardStep2LoadData source="xsd" onLoaded={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(screen.getByText(/Bad schema/)).toBeInTheDocument();
  });
});
