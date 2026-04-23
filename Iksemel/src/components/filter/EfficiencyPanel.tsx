/**
 * Efficiency Panel Component
 * 
 * Displays filter efficiency score, grade, and recommendations.
 */

import type { EfficiencyScore } from "@engine/analysis";
import styles from "./EfficiencyPanel.module.css";

interface EfficiencyPanelProps {
  score: EfficiencyScore;
}

export function EfficiencyPanel({ score }: EfficiencyPanelProps) {
  const gradeClass = `${styles[`grade${score.grade}`]} ${styles["gradeBadge"]}`;
  
  return (
    <div className={styles["panel"]}>
      <div className={styles["header"]}>
        <h3 className={styles["title"]}>Filter Efficiency</h3>
        <div className={gradeClass} aria-label={`Grade: ${score.grade}`}>
          {score.grade}
        </div>
      </div>
      
      <div className={styles["scoreBar"]}>
        <div 
          className={styles["scoreFill"]} 
          style={{ width: `${score.score}%` }}
          role="progressbar"
          aria-valuenow={score.score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <span className={styles["scoreValue"]}>{score.score}/100</span>
      </div>
      
      <div className={styles["factors"]}>
        <h4 className={styles["factorTitle"]}>Scoring Factors</h4>
        {score.factors.map((factor) => (
          <div key={factor.id} className={styles["factorRow"]}>
            <div className={styles["factorInfo"]}>
              <span className={styles["factorName"]}>{factor.name}</span>
              <span className={styles["factorDesc"]}>{factor.description}</span>
            </div>
            <div 
              className={`${styles["factorImpact"]} ${
                factor.impact > 0 ? styles["positive"] : 
                factor.impact < 0 ? styles["negative"] : ""
              }`}
            >
              {factor.impact > 0 ? "+" : ""}{factor.impact}
            </div>
          </div>
        ))}
      </div>
      
      {score.recommendations.length > 0 && (
        <div className={styles["recommendations"]}>
          <h4 className={styles["recTitle"]}>Recommendations</h4>
          <ul className={styles["recList"]}>
            {score.recommendations.map((rec, idx) => (
              <li key={idx} className={styles["recItem"]}>
                <span className={styles["recIcon"]} aria-hidden="true">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
