import { describe, it, expect, beforeEach } from "vitest";
import {
  registerPostProcessor,
  getPostProcessor,
  hasPostProcessor,
  clearPostProcessorRegistry,
  type PostProcessInput,
  type PostProcessResult,
} from "./post-processor-registry";

describe("PostProcessorRegistry", () => {
  beforeEach(() => {
    clearPostProcessorRegistry();
  });

  const mockProcessor = async (_input: PostProcessInput): Promise<PostProcessResult> => ({
    data: new Uint8Array([0x50, 0x4b]),
    mimeType: "application/zip",
    extension: ".xlsx",
  });

  it("registers and retrieves a post-processor", () => {
    registerPostProcessor("xlsx-native", mockProcessor);
    const retrieved = getPostProcessor("xlsx-native");
    expect(retrieved).toBe(mockProcessor);
  });

  it("returns undefined for unregistered format", () => {
    expect(getPostProcessor("xlsx-native")).toBeUndefined();
  });

  it("hasPostProcessor returns true when registered", () => {
    registerPostProcessor("xlsx-native", mockProcessor);
    expect(hasPostProcessor("xlsx-native")).toBe(true);
  });

  it("hasPostProcessor returns false when not registered", () => {
    expect(hasPostProcessor("xlsx-native")).toBe(false);
  });

  it("replaces existing registration", () => {
    const otherProcessor = async (_input: PostProcessInput): Promise<PostProcessResult> => ({
      data: new Uint8Array([0x00]),
      mimeType: "test/test",
      extension: ".test",
    });
    registerPostProcessor("xlsx-native", mockProcessor);
    registerPostProcessor("xlsx-native", otherProcessor);
    expect(getPostProcessor("xlsx-native")).toBe(otherProcessor);
  });

  it("clear removes all registrations", () => {
    registerPostProcessor("xlsx-native", mockProcessor);
    registerPostProcessor("docx-native", mockProcessor);
    clearPostProcessorRegistry();
    expect(hasPostProcessor("xlsx-native")).toBe(false);
    expect(hasPostProcessor("docx-native")).toBe(false);
  });
});
