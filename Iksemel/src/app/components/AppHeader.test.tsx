import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("shows Save button in embedded mode and triggers callback", () => {
    const onSendPackageReady = vi.fn();

    render(
      <AppHeader
        isEmbedded={true}
        hasSchema={true}
        hasPolicyErrors={false}
        onSendPackageReady={onSendPackageReady}
        onSchemaLoad={() => {}}
        onShowShortcuts={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save to WHATS'ON" }));
    expect(onSendPackageReady).toHaveBeenCalledTimes(1);
  });

  it("shows schema strip in non-embedded mode when schema is loaded", () => {
    render(
      <AppHeader
        isEmbedded={false}
        hasSchema={true}
        hasPolicyErrors={false}
        onSendPackageReady={() => {}}
        onSchemaLoad={() => {}}
        onShowShortcuts={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Replace Schema" })).toBeInTheDocument();
  });

  it("opens shortcuts callback when help button is clicked", () => {
    const onShowShortcuts = vi.fn();

    render(
      <AppHeader
        isEmbedded={false}
        hasSchema={false}
        hasPolicyErrors={false}
        onSendPackageReady={() => {}}
        onSchemaLoad={() => {}}
        onShowShortcuts={onShowShortcuts}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Keyboard shortcuts/i }));
    expect(onShowShortcuts).toHaveBeenCalledTimes(1);
  });
});
