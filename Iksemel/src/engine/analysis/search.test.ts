import { describe, it, expect } from "vitest";
import type { SchemaNode } from "@/types";
import { searchSchema } from "./search";

function makeTree(): SchemaNode[] {
  return [
    {
      id: "root",
      name: "BroadcastExport",
      documentation: "Root element for broadcast schedule data export.",
      minOccurs: "1",
      maxOccurs: "1",
      type: "complex",
      typeName: "",
      isRequired: true,
      children: [
        {
          id: "c",
          name: "Channel",
          documentation: "A broadcast channel.",
          minOccurs: "1",
          maxOccurs: "unbounded",
          type: "complex",
          typeName: "",
          isRequired: true,
          children: [
            {
              id: "cn",
              name: "ChannelName",
              documentation: "Display name.",
              minOccurs: "1",
              maxOccurs: "1",
              type: "simple",
              typeName: "string",
              isRequired: true,
              children: [],
            },
            {
              id: "r",
              name: "Rights",
              documentation: "Content rights and licensing windows.",
              minOccurs: "0",
              maxOccurs: "1",
              type: "complex",
              typeName: "",
              isRequired: false,
              children: [
                {
                  id: "rw",
                  name: "RightsWindow",
                  documentation: "A specific rights window.",
                  minOccurs: "1",
                  maxOccurs: "unbounded",
                  type: "simple",
                  typeName: "string",
                  isRequired: true,
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

describe("searchSchema", () => {
  const tree = makeTree();

  it("finds nodes by name (case-insensitive)", () => {
    const results = searchSchema(tree, "right");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some((r) => r.node.name === "Rights")).toBe(true);
    expect(results.some((r) => r.node.name === "RightsWindow")).toBe(true);
  });

  it("finds nodes by documentation text", () => {
    const results = searchSchema(tree, "licensing");
    expect(results).toHaveLength(1);
    expect(results[0]?.matchIn).toBe("documentation");
    expect(results[0]?.node.name).toBe("Rights");
  });

  it("returns empty for no matches", () => {
    expect(searchSchema(tree, "nonexistent")).toHaveLength(0);
  });

  it("returns empty for empty query", () => {
    expect(searchSchema(tree, "")).toHaveLength(0);
    expect(searchSchema(tree, "   ")).toHaveLength(0);
  });

  it("includes path information", () => {
    const results = searchSchema(tree, "ChannelName");
    expect(results).toHaveLength(1);
    expect(results[0]?.path).toEqual(["BroadcastExport", "Channel", "ChannelName"]);
  });

  it("is case insensitive", () => {
    const results1 = searchSchema(tree, "CHANNEL");
    const results2 = searchSchema(tree, "channel");
    expect(results1.length).toBe(results2.length);
  });
});
