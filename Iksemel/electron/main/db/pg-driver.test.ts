// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock variables so they are available when vi.mock factory runs
const { mockQuery, mockEnd, mockPoolInstance, MockPool } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockEnd = vi.fn().mockResolvedValue(undefined);
  const mockPoolInstance = { query: mockQuery, end: mockEnd };
  const MockPool = vi.fn().mockImplementation(() => mockPoolInstance);
  return { mockQuery, mockEnd, mockPoolInstance, MockPool };
});

vi.mock("pg", () => ({ Pool: MockPool }));

import { PgDriver } from "./pg-driver";
import type { ConnectionProfileInput } from "../../preload/api";

const profile: ConnectionProfileInput = {
  label: "test",
  engine: "postgres",
  host: "localhost",
  port: 5432,
  database: "testdb",
  username: "pguser",
  password: "secret",
  schemas: ["public"],
  sslMode: "disable",
};

beforeEach(() => {
  vi.clearAllMocks();
  MockPool.mockImplementation(() => mockPoolInstance);
});

describe("PgDriver.connect", () => {
  it("creates a Pool with correct config", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ now: new Date() }] }); // ping
    const driver = new PgDriver();
    await driver.connect(profile);
    expect(MockPool).toHaveBeenCalledOnce();
    const poolConfig = MockPool.mock.calls[0][0];
    expect(poolConfig.host).toBe("localhost");
    expect(poolConfig.port).toBe(5432);
    expect(poolConfig.database).toBe("testdb");
    expect(poolConfig.user).toBe("pguser");
    expect(poolConfig.password).toBe("secret");
    expect(poolConfig.max).toBe(3);
    expect(poolConfig.idleTimeoutMillis).toBe(30000);
  });

  it("throws on ping failure", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    const driver = new PgDriver();
    await expect(driver.connect(profile)).rejects.toThrow("connection refused");
  });
});

describe("PgDriver.disconnect", () => {
  it("calls pool.end()", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const driver = new PgDriver();
    await driver.connect(profile);
    await driver.disconnect();
    expect(mockEnd).toHaveBeenCalledOnce();
  });
});

describe("PgDriver.getTables", () => {
  it("returns TABLE and VIEW rows from information_schema", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // connect ping
    mockQuery.mockResolvedValueOnce({
      rows: [
        { table_schema: "public", table_name: "programme", table_type: "BASE TABLE", row_count: "1234" },
        { table_schema: "public", table_name: "v_summary", table_type: "VIEW", row_count: null },
      ],
    });
    const driver = new PgDriver();
    await driver.connect(profile);
    const tables = await driver.getTables();
    expect(tables).toHaveLength(2);
    expect(tables[0].tableId).toBe("public.programme");
    expect(tables[0].type).toBe("TABLE");
    expect(tables[1].type).toBe("VIEW");
    expect(tables[0].rowCount).toBe(1234);
  });
});

describe("PgDriver.getColumns", () => {
  it("returns ColumnInfo array for a table", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // connect ping
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          column_name: "id",
          data_type: "integer",
          is_nullable: "NO",
          is_pk: true,
        },
        {
          column_name: "title",
          data_type: "character varying",
          is_nullable: "NO",
          is_pk: false,
        },
      ],
    });
    const driver = new PgDriver();
    await driver.connect(profile);
    const cols = await driver.getColumns("public.programme");
    expect(cols).toHaveLength(2);
    expect(cols[0].name).toBe("id");
    expect(cols[0].isPrimaryKey).toBe(true);
    expect(cols[1].nullable).toBe(false);
  });
});

describe("PgDriver.getForeignKeys", () => {
  it("returns ForeignKeyRelation array", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // connect ping
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          constraint_name: "fk_prog_genre",
          from_schema: "public",
          from_table: "programme",
          from_column: "genre_id",
          to_schema: "public",
          to_table: "genre",
          to_column: "id",
          is_composite: false,
        },
      ],
    });
    const driver = new PgDriver();
    await driver.connect(profile);
    const fks = await driver.getForeignKeys();
    expect(fks).toHaveLength(1);
    expect(fks[0].fkId).toBe("fk_prog_genre");
    expect(fks[0].fromTableId).toBe("public.programme");
    expect(fks[0].toTableId).toBe("public.genre");
    expect(fks[0].isSelfRef).toBe(false);
    expect(fks[0].isCircular).toBe(false);
  });
});

describe("PgDriver.getRowCount", () => {
  it("returns integer row count", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }); // connect
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "42" }] });
    const driver = new PgDriver();
    await driver.connect(profile);
    const count = await driver.getRowCount("public.programme");
    expect(count).toBe(42);
  });
});

describe("PgDriver SSL", () => {
  it("sets ssl: false when sslMode is disable", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const driver = new PgDriver();
    await driver.connect({ ...profile, sslMode: "disable" });
    const poolConfig = MockPool.mock.calls[0][0];
    expect(poolConfig.ssl).toBe(false);
  });

  it("sets ssl: { rejectUnauthorized: false } when sslMode is require", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const driver = new PgDriver();
    await driver.connect({ ...profile, sslMode: "require" });
    const poolConfig = MockPool.mock.calls[0][0];
    expect(poolConfig.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("sets ssl: { rejectUnauthorized: true } when sslMode is verify-full", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] });
    const driver = new PgDriver();
    await driver.connect({ ...profile, sslMode: "verify-full" });
    const poolConfig = MockPool.mock.calls[0][0];
    expect(poolConfig.ssl).toEqual({ rejectUnauthorized: true });
  });
});
