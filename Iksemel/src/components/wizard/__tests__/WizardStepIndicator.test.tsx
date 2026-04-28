import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardStepIndicator } from "../WizardStepIndicator";

const STEPS = ["Data Source", "Load Data", "Business Object"] as const;

describe("WizardStepIndicator", () => {
  it("renders all three step labels", () => {
    render(
      <WizardStepIndicator
        currentStep={1}
        completedSteps={new Set()}
        onStepClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Data Source")).toBeInTheDocument();
    expect(screen.getByText("Load Data")).toBeInTheDocument();
    expect(screen.getByText("Business Object")).toBeInTheDocument();
  });

  it("marks active step with aria-current=step", () => {
    render(
      <WizardStepIndicator
        currentStep={2}
        completedSteps={new Set([1])}
        onStepClick={vi.fn()}
      />,
    );
    const active = screen.getByRole("button", { name: /Load Data/ });
    expect(active).toHaveAttribute("aria-current", "step");
  });

  it("completed steps are clickable and fire onStepClick", () => {
    const onStepClick = vi.fn();
    render(
      <WizardStepIndicator
        currentStep={3}
        completedSteps={new Set([1, 2])}
        onStepClick={onStepClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Data Source/ }));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it("locked future steps have aria-disabled=true and do not fire onStepClick", () => {
    const onStepClick = vi.fn();
    render(
      <WizardStepIndicator
        currentStep={1}
        completedSteps={new Set()}
        onStepClick={onStepClick}
      />,
    );
    const locked = screen.getByRole("button", { name: /Business Object/ });
    expect(locked).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(locked);
    expect(onStepClick).not.toHaveBeenCalled();
  });
});
