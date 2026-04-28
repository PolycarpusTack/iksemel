import styles from "./WizardStepIndicator.module.css";

type WizardStep = 1 | 2 | 3;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Data Source",
  2: "Load Data",
  3: "Business Object",
};

interface WizardStepIndicatorProps {
  readonly currentStep: WizardStep;
  readonly completedSteps: ReadonlySet<WizardStep>;
  readonly onStepClick: (step: WizardStep) => void;
}

export function WizardStepIndicator({ currentStep, completedSteps, onStepClick }: WizardStepIndicatorProps) {
  const steps: WizardStep[] = [1, 2, 3];

  return (
    <nav className={styles["indicator"]} aria-label="Wizard steps">
      {steps.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = completedSteps.has(step);
        const isLocked = !isActive && !isCompleted;

        return (
          <div key={step} className={styles["stepWrapper"]}>
            {index > 0 && (
              <div
                className={`${styles["connector"]} ${isCompleted || isActive ? styles["connectorDone"] : ""}`}
              />
            )}
            <div className={styles["stepItem"]}>
              <button
                className={`${styles["bubble"]} ${isActive ? styles["bubbleActive"] : ""} ${isCompleted ? styles["bubbleCompleted"] : ""} ${isLocked ? styles["bubbleLocked"] : ""}`}
                aria-current={isActive ? "step" : undefined}
                aria-disabled={isLocked ? "true" : undefined}
                aria-label={`${STEP_LABELS[step]}${isCompleted ? " (completed)" : isActive ? " (current)" : " (not yet available)"}`}
                onClick={() => { if (!isLocked) onStepClick(step); }}
              >
                {isCompleted ? "✓" : step}
              </button>
              <span className={`${styles["label"]} ${isActive ? styles["labelActive"] : ""} ${isLocked ? styles["labelLocked"] : ""}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
