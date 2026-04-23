import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ConfigDiffResult } from "@engine/diff";
import { DiffOverlay } from "./DiffOverlay";

vi.mock("@components/diff", () => ({
  DiffViewer: (props: {
    onAcceptAll: () => void;
    onDismiss: () => void;
  }) => (
    <div>
      <button onClick={props.onAcceptAll}>accept-all</button>
      <button onClick={props.onDismiss}>dismiss</button>
    </div>
  ),
}));

const DIFF_FIXTURE: ConfigDiffResult = {
  changes: [
    {
      id: "chg-1",
      category: "field",
      changeType: "added",
      path: "selection.Title",
      label: "Add Title",
      newValue: "true",
    },
  ],
  summary: {
    totalChanges: 1,
    added: 1,
    removed: 0,
    modified: 0,
    byCategory: { field: 1 },
  },
  isIdentical: false,
  description: "1 change",
};

describe("DiffOverlay", () => {
  it("renders nothing when diff is null", () => {
    const { container } = render(
      <DiffOverlay diff={null} onAcceptAll={() => {}} onDismiss={() => {}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("wires DiffViewer callbacks", () => {
    const onAcceptAll = vi.fn();
    const onDismiss = vi.fn();

    render(
      <DiffOverlay
        diff={DIFF_FIXTURE}
        onAcceptAll={onAcceptAll}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "accept-all" }));
    fireEvent.click(screen.getByRole("button", { name: "dismiss" }));

    expect(onAcceptAll).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
