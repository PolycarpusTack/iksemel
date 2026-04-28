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
        uiMode="expert"
        onRequestModeSwitch={() => {}}
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
        uiMode="expert"
        onRequestModeSwitch={() => {}}
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
        uiMode="expert"
        onRequestModeSwitch={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Keyboard shortcuts/i }));
    expect(onShowShortcuts).toHaveBeenCalledTimes(1);
  });

  it("shows Guided Setup button when in expert mode", () => {
    render(
      <AppHeader
        isEmbedded={false}
        hasSchema={false}
        hasPolicyErrors={false}
        onSendPackageReady={() => {}}
        onSchemaLoad={() => {}}
        onShowShortcuts={() => {}}
        uiMode="expert"
        onRequestModeSwitch={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Guided Setup/ })).toBeInTheDocument();
  });

  it("shows Expert Mode button when in wizard mode", () => {
    render(
      <AppHeader
        isEmbedded={false}
        hasSchema={false}
        hasPolicyErrors={false}
        onSendPackageReady={() => {}}
        onSchemaLoad={() => {}}
        onShowShortcuts={() => {}}
        uiMode="wizard"
        onRequestModeSwitch={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Expert Mode/ })).toBeInTheDocument();
  });

  it("fires onRequestModeSwitch when toggle button is clicked", () => {
    const onRequestModeSwitch = vi.fn();
    render(
      <AppHeader
        isEmbedded={false}
        hasSchema={false}
        hasPolicyErrors={false}
        onSendPackageReady={() => {}}
        onSchemaLoad={() => {}}
        onShowShortcuts={() => {}}
        uiMode="expert"
        onRequestModeSwitch={onRequestModeSwitch}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Guided Setup/ }));
    expect(onRequestModeSwitch).toHaveBeenCalledTimes(1);
  });
});
