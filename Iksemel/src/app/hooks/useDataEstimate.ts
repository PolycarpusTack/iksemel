import { useEffect, useRef, useState } from "react";
import { estimatePayloadWithData, createDataProvider } from "@engine/data-provider";
import type { DataProvider } from "@engine/data-provider";
import type { SchemaNode, SelectionState } from "@/types";

interface DataEstimate {
  readonly estimatedKb: number;
  readonly source: "data" | "static";
}

export function useDataEstimate(
  schema: readonly SchemaNode[] | null,
  selection: SelectionState,
): DataEstimate | null {
  const dataProviderRef = useRef<DataProvider>(createDataProvider());
  const [dataEstimate, setDataEstimate] = useState<DataEstimate | null>(null);

  useEffect(() => {
    if (!schema || Object.keys(selection).length === 0) {
      setDataEstimate(null);
      return;
    }

    let cancelled = false;
    estimatePayloadWithData(schema, selection, dataProviderRef.current)
      .then((result) => {
        if (!cancelled) {
          setDataEstimate(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataEstimate(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [schema, selection]);

  return dataEstimate;
}
