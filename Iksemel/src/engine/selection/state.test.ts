import { describe, it, expect } from "vitest";
import type { SchemaNode } from "@/types";
import {
  getCheckState,
  toggleNode,
  selectAll,
  clearAll,
  countAll,
  countSelected,
  getSelectedLeaves,
  getRepeatingElements,
} from "./state";

/** Helper to create a simple test tree */
function makeTree(): SchemaNode {
  return {
    id: "root",
    name: "Root",
    documentation: "",
    minOccurs: "1",
    maxOccurs: "1",
    type: "complex",
    typeName: "",
    isRequired: true,
    children: [
      {
        id: "a",
        name: "A",
        documentation: "",
        minOccurs: "1",
        maxOccurs: "1",
        type: "complex",
        typeName: "",
        isRequired: true,
        children: [
          {
            id: "a1",
            name: "A1",
            documentation: "",
            minOccurs: "1",
            maxOccurs: "1",
            type: "simple",
            typeName: "string",
            isRequired: true,
            children: [],
          },
          {
            id: "a2",
            name: "A2",
            documentation: "",
            minOccurs: "0",
            maxOccurs: "1",
            type: "simple",
            typeName: "integer",
            isRequired: false,
            children: [],
          },
        ],
      },
      {
        id: "b",
        name: "B",
        documentation: "",
        minOccurs: "0",
        maxOccurs: "unbounded",
        type: "simple",
        typeName: "string",
        isRequired: false,
        children: [],
      },
    ],
  };
}

describe("getCheckState", () => {
  const tree = makeTree();

  it("returns unchecked for empty selection", () => {
    expect(getCheckState(tree, {})).toBe("unchecked");
  });

  it("returns checked when node and all descendants are selected", () => {
    const sel = { root: true, a: true, a1: true, a2: true, b: true };
    expect(getCheckState(tree, sel)).toBe("checked");
  });

  it("returns partial when some children are selected", () => {
    const sel = { root: true, a: true, a1: true };
    expect(getCheckState(tree, sel)).toBe("partial");
  });

  it("returns checked for a selected leaf node", () => {
    expect(getCheckState(tree.children[0]!.children[0]!, { a1: true })).toBe("checked");
  });

  it("returns unchecked for an unselected leaf node", () => {
    expect(getCheckState(tree.children[0]!.children[0]!, {})).toBe("unchecked");
  });

  it("returns partial when parent is selected but not all children", () => {
    const sel = { a: true, a1: true }; // a2 not selected
    const nodeA = tree.children[0]!;
    expect(getCheckState(nodeA, sel)).toBe("partial");
  });
});

describe("toggleNode", () => {
  const tree = makeTree();

  it("selects a leaf node and its ancestors", () => {
    const sel = toggleNode(tree.children[0]!.children[0]!, [tree], {});
    expect(sel["a1"]).toBe(true);
    expect(sel["a"]).toBe(true); // ancestor
    expect(sel["root"]).toBe(true); // ancestor
  });

  it("selects a parent and all descendants", () => {
    const sel = toggleNode(tree.children[0]!, [tree], {});
    expect(sel["a"]).toBe(true);
    expect(sel["a1"]).toBe(true);
    expect(sel["a2"]).toBe(true);
    expect(sel["root"]).toBe(true); // ancestor
  });

  it("unchecks a parent and all descendants", () => {
    const initial = { root: true, a: true, a1: true, a2: true, b: true };
    const sel = toggleNode(tree.children[0]!, [tree], initial);
    expect(sel["a"]).toBe(false);
    expect(sel["a1"]).toBe(false);
    expect(sel["a2"]).toBe(false);
  });

  it("unchecking last child removes parent partial state correctly", () => {
    const initial = { root: true, a: true, a1: true };
    // Uncheck a1 — the last selected child of A
    const sel = toggleNode(tree.children[0]!.children[0]!, [tree], initial);
    expect(sel["a1"]).toBe(false);
  });
});

describe("selectAll / clearAll", () => {
  const tree = makeTree();

  it("selectAll selects every node", () => {
    const sel = selectAll([tree]);
    expect(sel["root"]).toBe(true);
    expect(sel["a"]).toBe(true);
    expect(sel["a1"]).toBe(true);
    expect(sel["a2"]).toBe(true);
    expect(sel["b"]).toBe(true);
  });

  it("clearAll returns empty selection", () => {
    const sel = clearAll();
    expect(Object.keys(sel)).toHaveLength(0);
  });
});

describe("countAll / countSelected", () => {
  const tree = makeTree();

  it("counts all nodes in the tree", () => {
    expect(countAll([tree])).toBe(5);
  });

  it("counts selected nodes", () => {
    const sel = { root: true, a: true, a1: true };
    expect(countSelected([tree], sel)).toBe(3);
  });

  it("returns 0 for empty selection", () => {
    expect(countSelected([tree], {})).toBe(0);
  });
});

describe("getSelectedLeaves", () => {
  const tree = makeTree();

  it("returns selected leaf nodes with full paths", () => {
    const sel = { root: true, a: true, a1: true, a2: true };
    const leaves = getSelectedLeaves([tree], sel);
    expect(leaves).toHaveLength(2);
    expect(leaves[0]?.name).toBe("A1");
    expect(leaves[0]?.xpath).toBe("Root/A/A1");
    expect(leaves[1]?.name).toBe("A2");
  });

  it("returns empty array for no selection", () => {
    expect(getSelectedLeaves([tree], {})).toHaveLength(0);
  });

  it("only returns leaves, not containers", () => {
    const sel = { root: true, a: true, a1: true };
    const leaves = getSelectedLeaves([tree], sel);
    expect(leaves.every((l) => l.name !== "Root" && l.name !== "A")).toBe(true);
  });
});

describe("getRepeatingElements", () => {
  const tree = makeTree();

  it("finds unbounded elements", () => {
    const reps = getRepeatingElements([tree]);
    expect(reps).toHaveLength(1);
    expect(reps[0]?.name).toBe("B");
    expect(reps[0]?.xpath).toBe("Root/B");
  });
});
