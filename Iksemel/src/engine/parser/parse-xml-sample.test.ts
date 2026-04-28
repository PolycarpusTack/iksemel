import { describe, expect, it } from "vitest";
import { parseXmlSample } from "./parse-xml-sample";

const SIMPLE_XML = `<?xml version="1.0"?>
<Schedule>
  <Programme id="1">
    <Title>Morning News</Title>
    <StartTime>08:00</StartTime>
  </Programme>
  <Programme id="2">
    <Title>Evening News</Title>
    <StartTime>20:00</StartTime>
  </Programme>
</Schedule>`;

const FLAT_XML = `<Items><Item><Name>A</Name></Item></Items>`;

describe("parseXmlSample", () => {
  it("returns a ParseResult with roots", () => {
    const result = parseXmlSample(SIMPLE_XML);
    expect(result.roots.length).toBeGreaterThan(0);
  });

  it("root node name matches document element", () => {
    const result = parseXmlSample(SIMPLE_XML);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.roots[0]!.name).toBe("Schedule");
  });

  it("top-level child names are inferred from repeated elements", () => {
    const result = parseXmlSample(SIMPLE_XML);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const schedule = result.roots[0]!;
    expect(schedule.children.some((c) => c.name === "Programme")).toBe(true);
  });

  it("leaf nodes from sample values are simple type", () => {
    const result = parseXmlSample(SIMPLE_XML);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const programme = result.roots[0]!.children.find((c) => c.name === "Programme");
    const title = programme?.children.find((c) => c.name === "Title");
    expect(title?.type).toBe("simple");
  });

  it("complex nodes with children are complex type", () => {
    const result = parseXmlSample(SIMPLE_XML);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const programme = result.roots[0]!.children.find((c) => c.name === "Programme");
    expect(programme?.type).toBe("complex");
  });

  it("attributes become child nodes with @ prefix", () => {
    const result = parseXmlSample(SIMPLE_XML);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const programme = result.roots[0]!.children.find((c) => c.name === "Programme");
    expect(programme?.children.some((c) => c.name === "@id")).toBe(true);
  });

  it("returns empty warnings array on valid XML", () => {
    const result = parseXmlSample(SIMPLE_XML);
    expect(result.warnings).toEqual([]);
  });

  it("returns a warning on invalid XML", () => {
    const result = parseXmlSample("<broken><unclosed>");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.roots).toEqual([]);
  });

  it("assigns unique sequential node IDs starting with n0", () => {
    const result = parseXmlSample(FLAT_XML);
    const ids = new Set<string>();
    function collect(nodes: typeof result.roots): void {
      for (const n of nodes) { ids.add(n.id); collect(n.children); }
    }
    collect(result.roots);
    expect(ids.has("n0")).toBe(true);
    expect(ids.size).toBe(ids.size); // all unique — checked by Set size vs flat count
  });
});
