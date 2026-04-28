import { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/state";
import type { SchemaNode, ParseWarning } from "@/types";
import { WizardStepIndicator } from "./WizardStepIndicator";
import { WizardStep1DataSource } from "./WizardStep1DataSource";
import { WizardStep2LoadData } from "./WizardStep2LoadData";
import { WizardStep3BusinessObject } from "./WizardStep3BusinessObject";
import styles from "./WizardShell.module.css";

type WizardStep = 1 | 2 | 3;
type SourceType = "xsd" | "xml-sample";

const WIZARD_STORAGE_KEY = "iksemel-wizard";

interface WizardLocalState {
  step: WizardStep;
  selectedSource: SourceType | null;
}

function loadWizardState(): WizardLocalState {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WizardLocalState>;
      return {
        step: (parsed.step as WizardStep) ?? 1,
        selectedSource: parsed.selectedSource ?? null,
      };
    }
  } catch {
    // ignore
  }
  return { step: 1, selectedSource: null };
}

function saveWizardState(state: WizardLocalState): void {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearWizardState(): void {
  try {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function WizardShell() {
  const dispatch = useAppDispatch();
  const schema = useAppSelector((s) => s.schema);
  const rowSource = useAppSelector((s) => s.rowSource);

  const [local, setLocal] = useState<WizardLocalState>(() => {
    const saved = loadWizardState();
    // Fast-forward based on AppState
    if (schema !== null) {
      return { ...saved, step: 3 };
    }
    return saved;
  });

  useEffect(() => {
    saveWizardState(local);
  }, [local]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== "Escape") return;
      if (local.step > 1) {
        setLocal((prev) => ({ ...prev, step: (prev.step - 1) as WizardStep }));
      } else {
        dispatch({ type: "SET_UI_MODE", uiMode: "expert" });
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [local.step, dispatch]);

  const completedSteps = new Set<WizardStep>();
  if (local.step > 1) completedSteps.add(1);
  if (local.step > 2) completedSteps.add(2);
  if (rowSource) completedSteps.add(3);

  const handleStepClick = useCallback((step: WizardStep) => {
    setLocal((prev) => ({ ...prev, step }));
  }, []);

  const handleSourceSelect = useCallback((source: SourceType) => {
    setLocal((prev) => ({ ...prev, selectedSource: source }));
  }, []);

  const handleSchemaLoaded = useCallback(
    (roots: readonly SchemaNode[], warnings: readonly ParseWarning[]) => {
      dispatch({ type: "LOAD_SCHEMA", roots, warnings });
      setLocal((prev) => ({ ...prev, step: 3 }));
    },
    [dispatch],
  );

  const handleCandidateSelect = useCallback(
    (xpath: string) => {
      dispatch({ type: "SET_ROW_SOURCE", rowSource: xpath });
    },
    [dispatch],
  );

  const handleFinish = useCallback(() => {
    clearWizardState();
    dispatch({ type: "SET_UI_MODE", uiMode: "expert" });
    dispatch({ type: "SET_ACTIVE_TAB", tab: "design" });
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (local.step < 3) setLocal((prev) => ({ ...prev, step: (prev.step + 1) as WizardStep }));
    if (local.step === 3) handleFinish();
  }, [local.step, handleFinish]);

  const handleBack = useCallback(() => {
    if (local.step > 1) setLocal((prev) => ({ ...prev, step: (prev.step - 1) as WizardStep }));
  }, [local.step]);

  const handleExitToExpert = useCallback(() => {
    dispatch({ type: "SET_UI_MODE", uiMode: "expert" });
  }, [dispatch]);

  const isNextEnabled =
    (local.step === 1 && local.selectedSource !== null) ||
    (local.step === 2 && schema !== null) ||
    (local.step === 3 && rowSource !== "");

  return (
    <div className={styles["shell"]}>
      <WizardStepIndicator
        currentStep={local.step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      <div className={styles["content"]}>
        {local.step === 1 && (
          <WizardStep1DataSource
            selectedSource={local.selectedSource}
            onSelect={handleSourceSelect}
          />
        )}
        {local.step === 2 && local.selectedSource && (
          <WizardStep2LoadData
            source={local.selectedSource}
            onLoaded={handleSchemaLoaded}
          />
        )}
        {local.step === 3 && (
          <WizardStep3BusinessObject
            schema={schema ?? []}
            selectedXPath={rowSource || null}
            onSelect={handleCandidateSelect}
          />
        )}
      </div>

      <div className={styles["nav"]}>
        <button
          className={styles["exitLink"]}
          onClick={handleExitToExpert}
        >
          Exit to Expert Mode
        </button>
        <div className={styles["navButtons"]}>
          {local.step > 1 && (
            <button className={styles["backBtn"]} onClick={handleBack}>
              ← Back
            </button>
          )}
          <button
            className={styles["nextBtn"]}
            onClick={handleNext}
            disabled={!isNextEnabled}
          >
            {local.step === 3 ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
