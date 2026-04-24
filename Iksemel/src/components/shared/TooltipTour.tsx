import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./TooltipTour.module.css";

const STORAGE_KEY = "xfeb-tour-completed";

interface TourStep {
  readonly targetSelector: string;
  readonly title: string;
  readonly description: string;
  readonly position: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: readonly TourStep[] = [
  {
    targetSelector: "[data-tour='upload']",
    title: "Load a Schema",
    description: "Start by uploading an XSD file or XML sample. You can also load the built-in demo broadcast schema.",
    position: "right",
  },
  {
    targetSelector: "[data-tour='tree']",
    title: "Select Fields",
    description: "Browse the schema tree and check the fields you need. Fewer fields mean smaller, faster exports.",
    position: "right",
  },
  {
    targetSelector: "[data-tour='metrics']",
    title: "Track Your Reduction",
    description: "See how many fields are selected and watch your payload reduction improve as you trim unneeded data.",
    position: "bottom",
  },
  {
    targetSelector: "[data-tour='filter']",
    title: "Add Filters",
    description: "Click any selected leaf field to add a value filter. Filtered fields show a funnel icon in the tree.",
    position: "right",
  },
  {
    targetSelector: "[data-tour='tabs']",
    title: "Configure & Export",
    description: "Design your output format in the Design tab, review the generated XSLT, and download your package when ready.",
    position: "left",
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 };
}

function tooltipStyle(rect: SpotlightRect | null, position: TourStep["position"]): React.CSSProperties {
  if (!rect) {
    return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const GAP = 16;
  switch (position) {
    case "right": return { position: "fixed", top: rect.top, left: rect.left + rect.width + GAP };
    case "left": return { position: "fixed", top: rect.top, left: rect.left - GAP, transform: "translateX(-100%)" };
    case "bottom": return { position: "fixed", top: rect.top + rect.height + GAP, left: rect.left };
    case "top": return { position: "fixed", top: rect.top - GAP, left: rect.left, transform: "translateY(-100%)" };
  }
}

interface TooltipTourProps {
  readonly onComplete: () => void;
}

export function TooltipTour({ onComplete }: TooltipTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const current = TOUR_STEPS[step]!;

  useEffect(() => {
    const r = getRect(current.targetSelector);
    setRect(r);
  }, [step, current.targetSelector]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, [step]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "1");
      onComplete();
    }
  }, [step, onComplete]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleSkip();
    else if (e.key === "Enter") handleNext();
    else if (e.key === "ArrowRight") handleNext();
    else if (e.key === "ArrowLeft") handlePrev();
  }, [handleSkip, handleNext, handlePrev]);

  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className={styles["overlay"]} aria-modal="true">
      {rect && (
        <div
          className={styles["spotlight"]}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}: ${current.title}`}
        tabIndex={-1}
        className={styles["tooltip"]}
        style={tooltipStyle(rect, current.position)}
        onKeyDown={handleKeyDown}
      >
        <div className={styles["header"]}>
          <span className={styles["step"]}>{step + 1} / {TOUR_STEPS.length}</span>
          <button className={styles["skipBtn"]} onClick={handleSkip} aria-label="Skip tour">Skip</button>
        </div>
        <h3 className={styles["title"]}>{current.title}</h3>
        <p className={styles["description"]}>{current.description}</p>
        <div className={styles["nav"]}>
          {step > 0 && (
            <button className={styles["navBtn"]} onClick={handlePrev}>← Back</button>
          )}
          <button className={`${styles["navBtn"]} ${styles["navBtnPrimary"]}`} onClick={handleNext}>
            {isLast ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useTour() {
  const [active, setActive] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const startTour = useCallback(() => setActive(true), []);
  const completeTour = useCallback(() => setActive(false), []);

  return { tourActive: active, startTour, completeTour };
}
