import type { ReportMetadata } from "@/types";
import { Input, Select } from "@components/primitives";
import { ToggleSwitch } from "@components/export/ToggleSwitch";
import styles from "./ExecutionSettings.module.css";

interface ExecutionSettingsProps {
  metadata: ReportMetadata;
  onChange: (metadata: Partial<ReportMetadata>) => void;
}

const PROCESSORS = ["Saxon-HE", "system-default"] as const;

/**
 * Convert a cron expression to a human-readable description.
 * Handles common patterns; returns "Custom schedule" for anything else.
 */
function describeCron(expr: string): string {
  const trimmed = expr.trim();
  if (trimmed === "") return "";

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return "Custom schedule";

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === undefined || hour === undefined) return "Custom schedule";

  // "0 6 * * 1-5" => "Weekdays at 06:00"
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "1-5") {
    return `Weekdays at ${pad(hour)}:${pad(minute)}`;
  }

  // "0 */2 * * *" => "Every 2 hours"
  if (minute === "0" && hour?.startsWith("*/") && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const interval = hour.slice(2);
    return `Every ${interval} hours`;
  }

  // Day-of-week specific: "0 8 * * 1" => "Mondays at 08:00"
  const dayNames: Record<string, string> = {
    "0": "Sundays", "1": "Mondays", "2": "Tuesdays", "3": "Wednesdays",
    "4": "Thursdays", "5": "Fridays", "6": "Saturdays", "7": "Sundays",
  };
  if (dayOfMonth === "*" && month === "*" && dayOfWeek !== undefined && dayOfWeek in dayNames) {
    return `${dayNames[dayOfWeek]} at ${pad(hour)}:${pad(minute)}`;
  }

  // "0 0 * * *" => "Daily at 00:00"
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Daily at ${pad(hour)}:${pad(minute)}`;
  }

  return "Custom schedule";
}

function pad(val: string | undefined): string {
  if (val === undefined) return "00";
  return val.padStart(2, "0");
}

export function ExecutionSettings({ metadata, onChange }: ExecutionSettingsProps) {
  const cronDescription = describeCron(metadata.scheduleCron);
  const scheduleEnabled = metadata.scheduleEnabled;

  return (
    <div className={styles["container"]}>
      <span className={styles["sectionLabel"]}>Execution Settings</span>

      <div
        className={
          `${styles["scheduleBlock"]} ${scheduleEnabled ? styles["scheduleBlockEnabled"] : ""}`
        }
      >
        <ToggleSwitch
          label="Scheduled Execution"
          checked={scheduleEnabled}
          onChange={(checked) => onChange({ scheduleEnabled: checked })}
        />

        {scheduleEnabled && (
          <>
            <div className={styles["cronRow"]}>
              <div className={`${styles["fieldGroup"]} ${styles["cronInput"]}`}>
                <label className={styles["fieldLabel"]}>Cron Expression</label>
                <Input
                  mono
                  value={metadata.scheduleCron}
                  placeholder="0 6 * * 1-5"
                  onChange={(e) => onChange({ scheduleCron: e.target.value })}
                />
              </div>
              <div
                className={
                  `${styles["cronPreview"]} ${cronDescription !== "" ? styles["cronPreviewActive"] : ""}`
                }
              >
                {cronDescription || "Enter a cron expression"}
              </div>
            </div>

            <div className={styles["fieldGroup"]}>
              <label className={styles["fieldLabel"]}>Schedule Description</label>
              <Input
                value={metadata.scheduleDescription}
                placeholder="e.g. Every weekday morning"
                onChange={(e) => onChange({ scheduleDescription: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      <div className={styles["divider"]} />

      <div className={styles["row"]}>
        <div className={styles["fieldGroup"]}>
          <label className={styles["fieldLabel"]}>Output Path</label>
          <Input
            mono
            value={metadata.outputPath}
            placeholder="/reports/output/"
            onChange={(e) => onChange({ outputPath: e.target.value })}
          />
        </div>

        <div className={styles["fieldGroup"]}>
          <label className={styles["fieldLabel"]}>Email Recipients</label>
          <Input
            value={metadata.emailRecipients}
            placeholder="user@example.com"
            onChange={(e) => onChange({ emailRecipients: e.target.value })}
          />
        </div>
      </div>

      <div className={styles["row"]}>
        <div className={styles["fieldGroup"]}>
          <ToggleSwitch
            label="Overwrite Existing Files"
            checked={metadata.overwrite}
            onChange={(checked) => onChange({ overwrite: checked })}
          />
        </div>

        <div className={styles["fieldGroup"]}>
          <label className={styles["fieldLabel"]}>XSLT Processor</label>
          <Select
            value={metadata.xsltProcessor}
            onChange={(e) => onChange({ xsltProcessor: e.target.value })}
          >
            {PROCESSORS.map((proc) => (
              <option key={proc} value={proc}>{proc}</option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
