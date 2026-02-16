import { describe, it, expect } from "vitest";
import { parseXSD } from "./parse-xsd";
import type { SchemaNode } from "@/types";
import { xsd } from "@/test/fixtures";

/** Helper to find a node by name in a tree */
function findNode(nodes: readonly SchemaNode[], name: string): SchemaNode | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    const found = findNode(node.children, name);
    if (found) return found;
  }
  return undefined;
}

/** Helper to count all nodes in a tree */
function countNodes(nodes: readonly SchemaNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countNodes(node.children);
  }
  return count;
}

// ─── 1.2.1: Core parsing — element extraction, inline complex types ────

describe("Core XSD parsing (Story 1.2.1)", () => {
  it("parses a simple element with built-in type", () => {
    const result = parseXSD(
      xsd(`<xs:element name="Title" type="xs:string"/>`),
    );
    expect(result.roots).toHaveLength(1);
    expect(result.roots[0]?.name).toBe("Title");
    expect(result.roots[0]?.type).toBe("simple");
    expect(result.roots[0]?.typeName).toBe("string");
  });

  it("parses element with inline complex type and child elements", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Person">
          <xs:complexType><xs:sequence>
            <xs:element name="FirstName" type="xs:string"/>
            <xs:element name="LastName" type="xs:string"/>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    expect(result.roots).toHaveLength(1);
    expect(result.roots[0]?.children).toHaveLength(2);
    expect(result.roots[0]?.children[0]?.name).toBe("FirstName");
    expect(result.roots[0]?.children[1]?.name).toBe("LastName");
  });

  it("handles nested complex types (3 levels deep)", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root">
          <xs:complexType><xs:sequence>
            <xs:element name="Level1">
              <xs:complexType><xs:sequence>
                <xs:element name="Level2">
                  <xs:complexType><xs:sequence>
                    <xs:element name="Leaf" type="xs:string"/>
                  </xs:sequence></xs:complexType>
                </xs:element>
              </xs:sequence></xs:complexType>
            </xs:element>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    const leaf = findNode(result.roots, "Leaf");
    expect(leaf).toBeDefined();
    expect(leaf?.type).toBe("simple");
    expect(leaf?.typeName).toBe("string");
  });

  it("parses minOccurs and maxOccurs correctly", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root">
          <xs:complexType><xs:sequence>
            <xs:element name="Required" type="xs:string"/>
            <xs:element name="Optional" type="xs:string" minOccurs="0"/>
            <xs:element name="Repeating" type="xs:string" maxOccurs="unbounded"/>
            <xs:element name="Limited" type="xs:string" minOccurs="0" maxOccurs="5"/>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    const required = findNode(result.roots, "Required");
    const optional = findNode(result.roots, "Optional");
    const repeating = findNode(result.roots, "Repeating");
    const limited = findNode(result.roots, "Limited");

    expect(required?.minOccurs).toBe("1");
    expect(required?.maxOccurs).toBe("1");
    expect(required?.isRequired).toBe(true);
    expect(optional?.minOccurs).toBe("0");
    expect(optional?.isRequired).toBe(false);
    expect(repeating?.maxOccurs).toBe("unbounded");
    expect(limited?.minOccurs).toBe("0");
    expect(limited?.maxOccurs).toBe("5");
  });

  it("extracts xs:annotation/xs:documentation", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Title" type="xs:string">
          <xs:annotation>
            <xs:documentation>The programme title.</xs:documentation>
          </xs:annotation>
        </xs:element>
      `),
    );
    expect(result.roots[0]?.documentation).toBe("The programme title.");
  });

  it("assigns unique IDs to all nodes", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root">
          <xs:complexType><xs:sequence>
            <xs:element name="A" type="xs:string"/>
            <xs:element name="B" type="xs:string"/>
            <xs:element name="C" type="xs:string"/>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    const ids = new Set<string>();
    function collectIds(nodes: readonly SchemaNode[]) {
      for (const n of nodes) {
        ids.add(n.id);
        collectIds(n.children);
      }
    }
    collectIds(result.roots);
    expect(ids.size).toBe(4); // Root + A + B + C
  });

  it("handles multiple root elements", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root1" type="xs:string"/>
        <xs:element name="Root2" type="xs:string"/>
      `),
    );
    expect(result.roots).toHaveLength(2);
  });

  it("returns nodeCount", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root">
          <xs:complexType><xs:sequence>
            <xs:element name="A" type="xs:string"/>
            <xs:element name="B" type="xs:string"/>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    expect(result.nodeCount).toBe(3);
  });
});

// ─── 1.2.2: Named complex type resolution ──────────────────────────────

describe("Named complex type resolution (Story 1.2.2)", () => {
  it("resolves type= reference to a named complex type", () => {
    const result = parseXSD(
      xsd(`
        <xs:complexType name="PersonType">
          <xs:sequence>
            <xs:element name="FirstName" type="xs:string"/>
            <xs:element name="LastName" type="xs:string"/>
          </xs:sequence>
        </xs:complexType>
        <xs:element name="Person" type="PersonType"/>
      `),
    );
    expect(result.roots).toHaveLength(1);
    expect(result.roots[0]?.name).toBe("Person");
    expect(result.roots[0]?.children).toHaveLength(2);
    expect(result.roots[0]?.children[0]?.name).toBe("FirstName");
  });

  it("resolves namespace-prefixed type references", () => {
    const result = parseXSD(
      `<?xml version="1.0" encoding="UTF-8"?>
       <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                  xmlns:tns="http://example.com"
                  targetNamespace="http://example.com">
         <xs:complexType name="AddressType">
           <xs:sequence>
             <xs:element name="City" type="xs:string"/>
           </xs:sequence>
         </xs:complexType>
         <xs:element name="Address" type="tns:AddressType"/>
       </xs:schema>`,
    );
    expect(result.roots[0]?.children).toHaveLength(1);
    expect(result.roots[0]?.children[0]?.name).toBe("City");
  });

  it("resolves named simple type references", () => {
    const result = parseXSD(
      xsd(`
        <xs:simpleType name="StatusType">
          <xs:restriction base="xs:string">
            <xs:enumeration value="ACTIVE"/>
            <xs:enumeration value="INACTIVE"/>
          </xs:restriction>
        </xs:simpleType>
        <xs:element name="Status" type="StatusType"/>
      `),
    );
    expect(result.roots[0]?.type).toBe("simple");
    expect(result.roots[0]?.typeName).toBe("StatusType");
  });

  it("warns on unknown type references", () => {
    const result = parseXSD(
      xsd(`<xs:element name="Foo" type="UnknownType"/>`),
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.message).toContain("Unknown type");
  });

  it("handles complex type extending a base type", () => {
    const result = parseXSD(
      xsd(`
        <xs:complexType name="BaseType">
          <xs:sequence>
            <xs:element name="BaseField" type="xs:string"/>
          </xs:sequence>
        </xs:complexType>
        <xs:complexType name="ExtendedType">
          <xs:complexContent>
            <xs:extension base="BaseType">
              <xs:sequence>
                <xs:element name="ExtField" type="xs:string"/>
              </xs:sequence>
            </xs:extension>
          </xs:complexContent>
        </xs:complexType>
        <xs:element name="Item" type="ExtendedType"/>
      `),
    );
    expect(result.roots[0]?.children).toHaveLength(2);
    expect(result.roots[0]?.children[0]?.name).toBe("BaseField");
    expect(result.roots[0]?.children[1]?.name).toBe("ExtField");
  });
});

// ─── 1.2.3: Element ref= resolution ────────────────────────────────────

describe("Element ref= resolution (Story 1.2.3)", () => {
  it("resolves element ref to a global element declaration", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="CommonHeader">
          <xs:complexType><xs:sequence>
            <xs:element name="Version" type="xs:string"/>
          </xs:sequence></xs:complexType>
        </xs:element>
        <xs:element name="Document">
          <xs:complexType><xs:sequence>
            <xs:element ref="CommonHeader"/>
            <xs:element name="Body" type="xs:string"/>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    const doc = result.roots.find((r) => r.name === "Document");
    expect(doc?.children).toHaveLength(2);
    expect(doc?.children[0]?.name).toBe("CommonHeader");
    expect(doc?.children[0]?.children).toHaveLength(1);
    expect(doc?.children[0]?.children[0]?.name).toBe("Version");
  });

  it("applies occurrence overrides from ref usage site", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Item" type="xs:string"/>
        <xs:element name="Container">
          <xs:complexType><xs:sequence>
            <xs:element ref="Item" minOccurs="0" maxOccurs="unbounded"/>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    const container = result.roots.find((r) => r.name === "Container");
    expect(container?.children[0]?.minOccurs).toBe("0");
    expect(container?.children[0]?.maxOccurs).toBe("unbounded");
  });

  it("warns on unresolved ref", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root">
          <xs:complexType><xs:sequence>
            <xs:element ref="NonExistent"/>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.message).toContain("Unresolved element ref");
  });
});

// ─── 1.2.4: xs:attribute parsing ────────────────────────────────────────

describe("xs:attribute parsing (Story 1.2.4)", () => {
  it("parses attributes as @-prefixed leaf nodes", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Channel">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="Name" type="xs:string"/>
            </xs:sequence>
            <xs:attribute name="id" type="xs:string" use="required"/>
            <xs:attribute name="active" type="xs:boolean"/>
          </xs:complexType>
        </xs:element>
      `),
    );
    const channel = result.roots[0];
    expect(channel?.children).toHaveLength(3); // Name + @id + @active

    const idAttr = channel?.children.find((c) => c.name === "@id");
    expect(idAttr).toBeDefined();
    expect(idAttr?.isAttribute).toBe(true);
    expect(idAttr?.type).toBe("simple");
    expect(idAttr?.typeName).toBe("string");
    expect(idAttr?.minOccurs).toBe("1"); // use="required"
    expect(idAttr?.isRequired).toBe(true);

    const activeAttr = channel?.children.find((c) => c.name === "@active");
    expect(activeAttr?.minOccurs).toBe("0"); // use="optional" (default)
    expect(activeAttr?.isRequired).toBe(false);
  });

  it("attributes have maxOccurs of 1", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Item">
          <xs:complexType>
            <xs:attribute name="code" type="xs:string"/>
          </xs:complexType>
        </xs:element>
      `),
    );
    const attr = findNode(result.roots, "@code");
    expect(attr?.maxOccurs).toBe("1");
  });
});

// ─── 1.2.5: xs:choice vs xs:sequence vs xs:all ─────────────────────────

describe("Composition type differentiation (Story 1.2.5)", () => {
  it("detects xs:sequence composition type", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root">
          <xs:complexType><xs:sequence>
            <xs:element name="A" type="xs:string"/>
          </xs:sequence></xs:complexType>
        </xs:element>
      `),
    );
    expect(result.roots[0]?.compositionType).toBe("sequence");
  });

  it("detects xs:choice composition type", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root">
          <xs:complexType><xs:choice>
            <xs:element name="OptionA" type="xs:string"/>
            <xs:element name="OptionB" type="xs:integer"/>
            <xs:element name="OptionC" type="xs:boolean"/>
          </xs:choice></xs:complexType>
        </xs:element>
      `),
    );
    expect(result.roots[0]?.compositionType).toBe("choice");
    expect(result.roots[0]?.children).toHaveLength(3);
  });

  it("detects xs:all composition type", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Root">
          <xs:complexType><xs:all>
            <xs:element name="X" type="xs:string"/>
            <xs:element name="Y" type="xs:string"/>
          </xs:all></xs:complexType>
        </xs:element>
      `),
    );
    expect(result.roots[0]?.compositionType).toBe("all");
  });
});

// ─── 1.2.6: Enumeration extraction ─────────────────────────────────────

describe("Enumeration extraction (Story 1.2.6)", () => {
  it("extracts enumerations from named simple type", () => {
    const result = parseXSD(
      xsd(`
        <xs:simpleType name="SlotStatus">
          <xs:restriction base="xs:string">
            <xs:enumeration value="PLANNED"/>
            <xs:enumeration value="CONFIRMED"/>
            <xs:enumeration value="AIRED"/>
            <xs:enumeration value="CANCELLED"/>
          </xs:restriction>
        </xs:simpleType>
        <xs:element name="Status" type="SlotStatus"/>
      `),
    );
    expect(result.roots[0]?.enumerations).toEqual([
      "PLANNED",
      "CONFIRMED",
      "AIRED",
      "CANCELLED",
    ]);
  });

  it("extracts enumerations from inline simple type", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Color">
          <xs:simpleType>
            <xs:restriction base="xs:string">
              <xs:enumeration value="RED"/>
              <xs:enumeration value="GREEN"/>
              <xs:enumeration value="BLUE"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
      `),
    );
    expect(result.roots[0]?.enumerations).toEqual(["RED", "GREEN", "BLUE"]);
  });

  it("returns undefined enumerations for non-restricted types", () => {
    const result = parseXSD(
      xsd(`<xs:element name="Text" type="xs:string"/>`),
    );
    expect(result.roots[0]?.enumerations).toBeUndefined();
  });
});

// ─── 1.2.8: Parser safety ──────────────────────────────────────────────

describe("Parser safety (Story 1.2.8)", () => {
  it("detects circular type references", () => {
    const result = parseXSD(
      xsd(`
        <xs:complexType name="NodeType">
          <xs:sequence>
            <xs:element name="Value" type="xs:string"/>
            <xs:element name="Child" type="NodeType" minOccurs="0"/>
          </xs:sequence>
        </xs:complexType>
        <xs:element name="Root" type="NodeType"/>
      `),
    );
    expect(result.warnings.some((w) => w.message.includes("Circular"))).toBe(true);
    // Should still produce a valid (if truncated) tree
    expect(result.roots).toHaveLength(1);
    expect(result.roots[0]?.children.length).toBeGreaterThanOrEqual(1);
  });

  it("enforces depth limit", () => {
    // Build a deeply nested schema
    let inner = `<xs:element name="Leaf" type="xs:string"/>`;
    for (let i = 0; i < 25; i++) {
      inner = `<xs:element name="L${i}"><xs:complexType><xs:sequence>${inner}</xs:sequence></xs:complexType></xs:element>`;
    }
    expect(() => parseXSD(xsd(inner), { maxDepth: 20 })).toThrow(
      "Maximum depth",
    );
  });

  it("enforces node count limit", () => {
    const elements = Array.from({ length: 100 }, (_, i) =>
      `<xs:element name="E${i}" type="xs:string"/>`,
    ).join("");
    expect(() =>
      parseXSD(
        xsd(`<xs:element name="Root"><xs:complexType><xs:sequence>${elements}</xs:sequence></xs:complexType></xs:element>`),
        { maxNodes: 50 },
      ),
    ).toThrow("Maximum node count");
  });

  it("throws on invalid XML", () => {
    expect(() => parseXSD("not xml")).toThrow("Invalid XSD");
  });

  it("throws on empty schema", () => {
    const result = parseXSD(xsd(""));
    expect(result.roots).toHaveLength(0);
  });
});

// ─── 1.2.10: Various XSD type tests ────────────────────────────────────

describe("Built-in XSD types (Story 1.2.10)", () => {
  const types = [
    "string", "boolean", "decimal", "float", "double",
    "duration", "dateTime", "time", "date", "gYear",
    "integer", "int", "long", "short", "byte",
    "positiveInteger", "nonNegativeInteger",
  ];

  for (const typeName of types) {
    it(`recognizes xs:${typeName} as simple type`, () => {
      const result = parseXSD(
        xsd(`<xs:element name="Field" type="xs:${typeName}"/>`),
      );
      expect(result.roots[0]?.type).toBe("simple");
      expect(result.roots[0]?.typeName).toBe(typeName);
    });
  }
});

// ─── Demo schema integration test ──────────────────────────────────────

describe("Demo broadcast XSD integration test", () => {
  const DEMO_XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="BroadcastExport">
    <xs:annotation><xs:documentation>Root element for broadcast schedule data export.</xs:documentation></xs:annotation>
    <xs:complexType><xs:sequence>
      <xs:element name="ExportMetadata">
        <xs:complexType><xs:sequence>
          <xs:element name="ExportTimestamp" type="xs:dateTime"/>
          <xs:element name="ExportVersion" type="xs:string"/>
          <xs:element name="DateRangeStart" type="xs:date"/>
          <xs:element name="DateRangeEnd" type="xs:date"/>
          <xs:element name="SourceSystem" type="xs:string"/>
        </xs:sequence></xs:complexType>
      </xs:element>
      <xs:element name="Channels">
        <xs:complexType><xs:sequence>
          <xs:element name="Channel" maxOccurs="unbounded">
            <xs:complexType><xs:sequence>
              <xs:element name="ChannelCode" type="xs:string"/>
              <xs:element name="ChannelName" type="xs:string"/>
              <xs:element name="Schedule">
                <xs:complexType><xs:sequence>
                  <xs:element name="Slot" maxOccurs="unbounded">
                    <xs:complexType><xs:sequence>
                      <xs:element name="SlotId" type="xs:string"/>
                      <xs:element name="SlotDate" type="xs:date"/>
                      <xs:element name="StartTime" type="xs:dateTime"/>
                      <xs:element name="Title" type="xs:string"/>
                    </xs:sequence></xs:complexType>
                  </xs:element>
                </xs:sequence></xs:complexType>
              </xs:element>
            </xs:sequence></xs:complexType>
          </xs:element>
        </xs:sequence></xs:complexType>
      </xs:element>
    </xs:sequence></xs:complexType>
  </xs:element>
</xs:schema>`;

  it("parses the demo schema correctly", () => {
    const result = parseXSD(DEMO_XSD);
    expect(result.roots).toHaveLength(1);
    expect(result.roots[0]?.name).toBe("BroadcastExport");
    expect(result.warnings).toHaveLength(0);
  });

  it("preserves documentation", () => {
    const result = parseXSD(DEMO_XSD);
    expect(result.roots[0]?.documentation).toBe(
      "Root element for broadcast schedule data export.",
    );
  });

  it("finds all expected elements", () => {
    const result = parseXSD(DEMO_XSD);
    const expectedNames = [
      "BroadcastExport", "ExportMetadata", "ExportTimestamp",
      "ExportVersion", "DateRangeStart", "DateRangeEnd", "SourceSystem",
      "Channels", "Channel", "ChannelCode", "ChannelName",
      "Schedule", "Slot", "SlotId", "SlotDate", "StartTime", "Title",
    ];
    for (const name of expectedNames) {
      expect(findNode(result.roots, name)).toBeDefined();
    }
  });

  it("correctly identifies repeating elements", () => {
    const result = parseXSD(DEMO_XSD);
    const channel = findNode(result.roots, "Channel");
    expect(channel?.maxOccurs).toBe("unbounded");
    const slot = findNode(result.roots, "Slot");
    expect(slot?.maxOccurs).toBe("unbounded");
  });

  it("correctly types leaf elements", () => {
    const result = parseXSD(DEMO_XSD);
    expect(findNode(result.roots, "ExportTimestamp")?.typeName).toBe("dateTime");
    expect(findNode(result.roots, "DateRangeStart")?.typeName).toBe("date");
    expect(findNode(result.roots, "ChannelCode")?.typeName).toBe("string");
  });
});

// ─── 1.2.11: Performance ───────────────────────────────────────────────

describe("Parser performance (Story 1.2.11)", () => {
  // Note: jsdom DOMParser has ~3-5x overhead vs browser DOMParser.
  // These thresholds account for the test environment; browser targets
  // are 50ms/200ms/500ms per the plan (verified via browser benchmarks).
  const JSDOM_OVERHEAD = 6;

  function generateSchema(elementCount: number): string {
    const elements = Array.from({ length: elementCount }, (_, i) =>
      `<xs:element name="Field${i}" type="xs:string"/>`,
    ).join("");
    return xsd(`
      <xs:element name="Root">
        <xs:complexType><xs:sequence>${elements}</xs:sequence></xs:complexType>
      </xs:element>
    `);
  }

  it("parses 100-element schema within budget", () => {
    const schema = generateSchema(100);
    const start = performance.now();
    const result = parseXSD(schema);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50 * JSDOM_OVERHEAD);
    expect(countNodes(result.roots)).toBe(101);
  });

  it("parses 500-element schema within budget", () => {
    const schema = generateSchema(500);
    const start = performance.now();
    const result = parseXSD(schema);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200 * JSDOM_OVERHEAD);
    expect(countNodes(result.roots)).toBe(501);
  });

  it("parses 1000-element schema within budget", () => {
    const schema = generateSchema(1000);
    const start = performance.now();
    const result = parseXSD(schema);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500 * JSDOM_OVERHEAD);
    expect(countNodes(result.roots)).toBe(1001);
  });
});

// ─── 1.2: Restriction facet extraction ─────────────────────────────────

describe("Restriction facet extraction (Story 1.2)", () => {
  it("extracts minInclusive and maxInclusive from inline simple type restriction", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Score">
          <xs:simpleType>
            <xs:restriction base="xs:integer">
              <xs:minInclusive value="0"/>
              <xs:maxInclusive value="100"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
      `),
    );
    expect(result.roots[0]?.facets).toBeDefined();
    expect(result.roots[0]?.facets?.minInclusive).toBe("0");
    expect(result.roots[0]?.facets?.maxInclusive).toBe("100");
  });

  it("extracts pattern facet from named simple type", () => {
    const result = parseXSD(
      xsd(`
        <xs:simpleType name="PhoneType">
          <xs:restriction base="xs:string">
            <xs:pattern value="\\d{3}-\\d{3}-\\d{4}"/>
          </xs:restriction>
        </xs:simpleType>
        <xs:element name="Phone" type="PhoneType"/>
      `),
    );
    expect(result.roots[0]?.facets).toBeDefined();
    expect(result.roots[0]?.facets?.pattern).toBe("\\d{3}-\\d{3}-\\d{4}");
  });

  it("extracts minLength and maxLength facets", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Username">
          <xs:simpleType>
            <xs:restriction base="xs:string">
              <xs:minLength value="3"/>
              <xs:maxLength value="50"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
      `),
    );
    expect(result.roots[0]?.facets).toBeDefined();
    expect(result.roots[0]?.facets?.minLength).toBe(3);
    expect(result.roots[0]?.facets?.maxLength).toBe(50);
  });

  it("extracts totalDigits and fractionDigits", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Price">
          <xs:simpleType>
            <xs:restriction base="xs:decimal">
              <xs:totalDigits value="10"/>
              <xs:fractionDigits value="2"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
      `),
    );
    expect(result.roots[0]?.facets).toBeDefined();
    expect(result.roots[0]?.facets?.totalDigits).toBe(10);
    expect(result.roots[0]?.facets?.fractionDigits).toBe(2);
  });

  it("returns undefined facets when no restriction present", () => {
    const result = parseXSD(
      xsd(`<xs:element name="Plain" type="xs:string"/>`),
    );
    expect(result.roots[0]?.facets).toBeUndefined();
  });

  it("extracts facets from attribute inline simple type", () => {
    const result = parseXSD(
      xsd(`
        <xs:element name="Product">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="Name" type="xs:string"/>
            </xs:sequence>
            <xs:attribute name="rating">
              <xs:simpleType>
                <xs:restriction base="xs:integer">
                  <xs:minInclusive value="1"/>
                  <xs:maxInclusive value="5"/>
                </xs:restriction>
              </xs:simpleType>
            </xs:attribute>
          </xs:complexType>
        </xs:element>
      `),
    );
    const ratingAttr = findNode(result.roots, "@rating");
    expect(ratingAttr).toBeDefined();
    expect(ratingAttr?.facets).toBeDefined();
    expect(ratingAttr?.facets?.minInclusive).toBe("1");
    expect(ratingAttr?.facets?.maxInclusive).toBe("5");
  });
});
