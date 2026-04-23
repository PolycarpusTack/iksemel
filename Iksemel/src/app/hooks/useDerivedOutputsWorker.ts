import { useEffect, useMemo, useRef, useState } from "react";
import { deriveOutputs } from "./derived-outputs-core";
import type { DerivedOutputs, DerivedOutputsInput } from "./derived-outputs-core";

interface WorkerResponse {
  readonly id: number;
  readonly output: DerivedOutputs;
}

function useWorkerEnabled(): boolean {
  return import.meta.env.VITE_DERIVED_WORKER !== "false";
}

export function useDerivedOutputsWorker(input: DerivedOutputsInput): DerivedOutputs {
  const enabled = useWorkerEnabled();
  const [workerOutput, setWorkerOutput] = useState<DerivedOutputs | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  const fallback = useMemo(() => {
    if (enabled && workerOutput !== null) {
      return workerOutput;
    }
    return deriveOutputs(input);
  }, [enabled, input, workerOutput]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../workers/derived-outputs.worker.ts", import.meta.url),
        { type: "module" },
      );
    }

    const worker = workerRef.current;
    const requestId = ++requestIdRef.current;

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== requestIdRef.current) {
        return;
      }
      setWorkerOutput(event.data.output);
    };

    worker.addEventListener("message", handleMessage);
    worker.postMessage({ id: requestId, input });

    return () => {
      worker.removeEventListener("message", handleMessage);
    };
  }, [enabled, input]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  return fallback;
}
