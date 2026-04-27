// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mapDbTypeToXsdType } from "./type-mapper";

describe("mapDbTypeToXsdType — postgres", () => {
  const pg = "postgres" as const;

  it.each([
    ["VARCHAR", "xs:string"],
    ["VARCHAR(255)", "xs:string"],
    ["CHAR(10)", "xs:string"],
    ["TEXT", "xs:string"],
    ["NVARCHAR", "xs:string"],
    ["CHARACTER VARYING", "xs:string"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBe(expected);
  });

  it.each([
    ["INTEGER", "xs:integer"],
    ["INT", "xs:integer"],
    ["INT4", "xs:integer"],
    ["SMALLINT", "xs:integer"],
    ["BIGINT", "xs:integer"],
    ["INT8", "xs:integer"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBe(expected);
  });

  it.each([
    ["NUMERIC", "xs:decimal"],
    ["NUMERIC(10,2)", "xs:decimal"],
    ["DECIMAL", "xs:decimal"],
    ["DECIMAL(8,3)", "xs:decimal"],
    ["FLOAT", "xs:decimal"],
    ["FLOAT8", "xs:decimal"],
    ["DOUBLE PRECISION", "xs:decimal"],
    ["REAL", "xs:decimal"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBe(expected);
  });

  it("maps BOOLEAN → xs:boolean", () => {
    expect(mapDbTypeToXsdType("BOOLEAN", pg)).toBe("xs:boolean");
  });

  it("maps BOOL → xs:boolean", () => {
    expect(mapDbTypeToXsdType("BOOL", pg)).toBe("xs:boolean");
  });

  it("maps DATE → xs:date (PG DATE has no time component)", () => {
    expect(mapDbTypeToXsdType("DATE", pg)).toBe("xs:date");
  });

  it.each([
    ["TIMESTAMP", "xs:dateTime"],
    ["TIMESTAMP WITH TIME ZONE", "xs:dateTime"],
    ["TIMESTAMPTZ", "xs:dateTime"],
    ["DATETIME", "xs:dateTime"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBe(expected);
  });

  it.each([
    ["BYTEA", null],
    ["OID", null],
  ])("maps %s → null (excluded)", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, pg)).toBeNull();
  });

  it("returns xs:string for unknown types", () => {
    expect(mapDbTypeToXsdType("CUSTOM_TYPE", pg)).toBe("xs:string");
  });
});

describe("mapDbTypeToXsdType — oracle", () => {
  const ora = "oracle" as const;

  it.each([
    ["VARCHAR2", "xs:string"],
    ["VARCHAR2(100)", "xs:string"],
    ["CHAR", "xs:string"],
    ["NVARCHAR2", "xs:string"],
    ["NCHAR", "xs:string"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, ora)).toBe(expected);
  });

  it.each([
    ["NUMBER", "xs:decimal"],
    ["NUMBER(10)", "xs:decimal"],
    ["NUMBER(10,2)", "xs:decimal"],
    ["FLOAT", "xs:decimal"],
    ["BINARY_FLOAT", "xs:decimal"],
    ["BINARY_DOUBLE", "xs:decimal"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, ora)).toBe(expected);
  });

  it("maps INTEGER → xs:integer for Oracle", () => {
    expect(mapDbTypeToXsdType("INTEGER", ora)).toBe("xs:integer");
  });

  it("maps DATE → xs:dateTime for Oracle (Oracle DATE includes time)", () => {
    expect(mapDbTypeToXsdType("DATE", ora)).toBe("xs:dateTime");
  });

  it.each([
    ["TIMESTAMP", "xs:dateTime"],
    ["TIMESTAMP WITH TIME ZONE", "xs:dateTime"],
    ["TIMESTAMP WITH LOCAL TIME ZONE", "xs:dateTime"],
  ])("maps %s → %s", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, ora)).toBe(expected);
  });

  it.each([
    ["CLOB", null],
    ["NCLOB", null],
    ["BLOB", null],
    ["RAW", null],
    ["LONG RAW", null],
  ])("maps %s → null (excluded)", (dbType, expected) => {
    expect(mapDbTypeToXsdType(dbType, ora)).toBeNull();
  });
});
