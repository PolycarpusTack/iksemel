import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createPackageZip, getPackageZipBackend } from "./create-package-zip";

describe("createPackageZip", () => {
  it("uses jszip backend by default", async () => {
    const backend = await getPackageZipBackend();
    expect(backend.name).toBe("jszip");
  });

  it("creates a valid zip archive containing all entries", async () => {
    const zipBytes = await createPackageZip([
      { path: "report-filter.xml", content: "<filter/>" },
      { path: "report-transform.xslt", content: "<xsl:stylesheet/>" },
      { path: "report-report.xml", content: "<report/>" },
    ]);

    const zip = await JSZip.loadAsync(zipBytes);
    expect(await zip.file("report-filter.xml")?.async("string")).toBe("<filter/>");
    expect(await zip.file("report-transform.xslt")?.async("string")).toBe("<xsl:stylesheet/>");
    expect(await zip.file("report-report.xml")?.async("string")).toBe("<report/>");
  });
});
