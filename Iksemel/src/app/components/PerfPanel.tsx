import { useMemo, useState } from "react";
import { getPerfSummary, getRenderCounts, runZipBenchmark } from "@/app/perf/perf-tracker";
import type { ZipBenchmarkResult } from "@engine/package";
import styles from "../../App.module.css";

interface PerfPanelProps {
  readonly slug: string;
  readonly filterXml: string;
  readonly xsltOutput: string;
  readonly reportXml: string;
}

export function PerfPanel(props: PerfPanelProps) {
  const { slug, filterXml, xsltOutput, reportXml } = props;
  const [results, setResults] = useState<readonly ZipBenchmarkResult[] | null>(null);
  const [running, setRunning] = useState(false);

  const summary = getPerfSummary();
  const renderCounts = getRenderCounts();

  const entries = useMemo(() => [
    { path: `${slug || "export"}-filter.xml`, content: filterXml },
    { path: `${slug || "export"}-transform.xslt`, content: xsltOutput },
    { path: `${slug || "export"}-report.xml`, content: reportXml },
  ], [filterXml, reportXml, slug, xsltOutput]);

  const runBenchmark = async () => {
    setRunning(true);
    try {
      const output = await runZipBenchmark(entries);
      setResults(output);
    } finally {
      setRunning(false);
    }
  };

  return (
    <aside className={styles["perfPanel"]}>
      <strong>Perf Panel</strong>
      <div>Samples: {summary.count}</div>
      <div>Total Avg: {summary.totalMsAvg.toFixed(1)}ms</div>
      <div>Total P95: {summary.totalMsP95.toFixed(1)}ms</div>
      <div>Renders: L={renderCounts.LeftPanel ?? 0}, R={renderCounts.RightTabs ?? 0}</div>
      <button type="button" onClick={() => { void runBenchmark(); }} disabled={running}>
        {running ? "Running..." : "Run ZIP Benchmark"}
      </button>
      {results && (
        <ul>
          {results.map((item) => (
            <li key={item.backend}>
              {item.backend}: {item.ms.toFixed(1)}ms / {item.bytes} bytes
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
