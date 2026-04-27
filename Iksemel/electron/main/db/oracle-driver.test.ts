// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockClose, mockConnectionInstance, mockGetConnection } = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockClose = vi.fn().mockResolvedValue(undefined);
  const mockConnectionInstance = { execute: mockExecute, close: mockClose };
  const mockGetConnection = vi.fn().mockResolvedValue(mockConnectionInstance);
  return { mockExecute, mockClose, mockConnectionInstance, mockGetConnection };
});

vi.mock("oracledb", () => ({
  default: {
    getConnection: mockGetConnection,
    initOracleClient: vi.fn(),
    OUT_FORMAT_OBJECT: 4002,
  },
}));

import { OracleDriver, OracleClientMissingError } from "./oracle-driver";
import type { ConnectionProfileInput } from "../../preload/api";

const profile: ConnectionProfileInput = {
  label: "test",
  engine: "oracle",
  host: "orahost",
  port: 1521,
  database: "ORCL",
  username: "hr",
  password: "hr_pass",
  schemas: ["HR"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConnection.mockResolvedValue(mockConnectionInstance);
});

describe("OracleDriver.connect", () => {
  it("calls initOracleClient and getConnection with Easy Connect string", async () => {
    const oracledb = (await import("oracledb")).default;
    mockExecute.mockResolvedValueOnce({ rows: [] }); // ping
    const driver = new OracleDriver();
    await driver.connect(profile);
    expect(oracledb.initOracleClient).toHaveBeenCalledOnce();
    expect(mockGetConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        user: "hr",
        password: "hr_pass",
        connectString: "orahost:1521/ORCL",
      }),
    );
  });

  it("uses TNS alias when tnsAlias is provided", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const driver = new OracleDriver();
    await driver.connect({ ...profile, tnsAlias: "MY_TNS" });
    expect(mockGetConnection).toHaveBeenCalledWith(
      expect.objectContaining({ connectString: "MY_TNS" }),
    );
  });

  it("throws OracleClientMissingError when initOracleClient fails", async () => {
    const oracledb = (await import("oracledb")).default;
    (oracledb.initOracleClient as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error("DPI-1047: Cannot locate a 64-bit Oracle Client library");
    });
    const driver = new OracleDriver();
    await expect(driver.connect(profile)).rejects.toThrow(OracleClientMissingError);
  });
});

describe("OracleDriver.getTables", () => {
  it("returns tables filtered to selected schema, normalised to lowercase", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // ping
    mockExecute.mockResolvedValueOnce({
      rows: [
        { OWNER: "HR", TABLE_NAME: "EMPLOYEES", OBJECT_TYPE: "TABLE", NUM_ROWS: 107 },
        { OWNER: "HR", TABLE_NAME: "V_EMP", OBJECT_TYPE: "VIEW", NUM_ROWS: null },
      ],
    });
    const driver = new OracleDriver();
    await driver.connect(profile);
    const tables = await driver.getTables();
    expect(tables).toHaveLength(2);
    expect(tables[0].name).toBe("employees"); // normalised lowercase
    expect(tables[0].tableId).toBe("hr.employees");
    expect(tables[1].type).toBe("VIEW");
  });
});

describe("OracleDriver.getColumns", () => {
  it("returns ColumnInfo with normalised names, excludes CLOB/BLOB", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // ping
    mockExecute.mockResolvedValueOnce({
      rows: [
        { COLUMN_NAME: "EMPLOYEE_ID", DATA_TYPE: "NUMBER", NULLABLE: "N", IS_PK: 1 },
        { COLUMN_NAME: "FIRST_NAME", DATA_TYPE: "VARCHAR2", NULLABLE: "Y", IS_PK: 0 },
        { COLUMN_NAME: "RESUME", DATA_TYPE: "CLOB", NULLABLE: "Y", IS_PK: 0 },
      ],
    });
    const driver = new OracleDriver();
    await driver.connect(profile);
    const cols = await driver.getColumns("hr.employees");
    // CLOB should be excluded by the driver before returning
    expect(cols).toHaveLength(2);
    expect(cols[0].name).toBe("employee_id"); // lowercase
    expect(cols[0].isPrimaryKey).toBe(true);
    expect(cols[1].nullable).toBe(true);
  });
});

describe("OracleDriver.disconnect", () => {
  it("calls connection.close()", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const driver = new OracleDriver();
    await driver.connect(profile);
    await driver.disconnect();
    expect(mockClose).toHaveBeenCalledOnce();
  });
});

describe("OracleDriver.fetchSampleStats", () => {
  it("returns sample stats for a column", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // ping
    mockExecute.mockResolvedValueOnce({
      rows: [{ TOTAL_COUNT: 107, DISTINCT_COUNT: 50, NULL_COUNT: 2 }],
    });
    const driver = new OracleDriver();
    await driver.connect(profile);
    const stats = await driver.fetchSampleStats(["hr.employees.employee_id"]);
    expect(stats).toHaveLength(1);
    expect(stats[0].fieldId).toBe("hr.employees.employee_id");
    expect(stats[0].totalCount).toBe(107);
    expect(stats[0].distinctCount).toBe(50);
    expect(stats[0].nullCount).toBe(2);
    expect(stats[0].values).toHaveLength(0);
  });

  it("returns empty stats on query failure", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] }); // ping
    mockExecute.mockRejectedValueOnce(new Error("ORA-00942: table or view does not exist"));
    const driver = new OracleDriver();
    await driver.connect(profile);
    const stats = await driver.fetchSampleStats(["hr.employees.employee_id"]);
    expect(stats).toHaveLength(1);
    expect(stats[0].totalCount).toBe(0);
    expect(stats[0].values).toHaveLength(0);
  });
});
