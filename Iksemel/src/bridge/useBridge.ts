/**
 * React hook for the PostMessage bridge.
 *
 * Manages the bridge lifecycle (start/stop), dispatches inbound messages
 * to the app reducer, and provides outbound message senders.
 */

import { useEffect, useRef, useCallback, useMemo } from "react";
import type { Dispatch } from "react";
import type { AppAction } from "@/state";
import type { SchemaNode, SelectionState, FilterValuesState, PolicyViolation } from "@/types";
import { parseXSD } from "@engine/parser";
import { countAll, countSelected } from "@engine/selection";
import { computeReduction } from "@engine/analysis";
import { estimateSelectedWeight } from "@engine/analysis/payload";
import { createBridge } from "./message-handler";
import type { Bridge } from "./message-handler";
import { parseReportConfig } from "./config-parser";
import { validateXmlDocument } from "@/utils";
import type { PackagePayload, SelectionMetrics } from "./types";

interface UseBridgeOptions {
  dispatch: Dispatch<AppAction>;
  schema: readonly SchemaNode[] | null;
  selection: SelectionState;
  filterXml: string;
  xsltOutput: string;
  reportXml: string;
  slug: string;
  filterValues: FilterValuesState;
  policyViolations: readonly PolicyViolation[];
}

interface UseBridgeResult {
  isEmbedded: boolean;
  sendPackageReady: () => void;
}

export function useBridge(options: UseBridgeOptions): UseBridgeResult {
  const { dispatch, schema, selection, filterXml, xsltOutput, reportXml, slug, filterValues, policyViolations } = options;
  const bridgeRef = useRef<Bridge | null>(null);

  // Create and start the bridge on mount
  useEffect(() => {
    const bridge = createBridge({
      onLoadSchema: (xsdContent: string) => {
        const result = parseXSD(xsdContent);
        dispatch({ type: "LOAD_SCHEMA", roots: result.roots, warnings: result.warnings });
      },
      onLoadConfig: (reportXmlContent: string) => {
        try {
          const xmlValidation = validateXmlDocument(reportXmlContent, "application/xml");
          if (!xmlValidation.valid) {
            throw new Error(xmlValidation.error ?? "Invalid report XML");
          }

          const config = parseReportConfig(reportXmlContent);
          dispatch({
            type: "LOAD_CONFIG",
            format: config.format,
            columns: config.columns,
            rowSource: config.rowSource,
            groupBy: config.groupBy,
            sortBy: config.sortBy,
            style: config.style,
            metadata: config.metadata,
            filterValues: config.filterValues,
          });
        } catch (err) {
          bridge.sendError("CONFIG_PARSE_ERROR", String(err));
        }
      },
      onLoadReferenceData: (entries) => {
        dispatch({ type: "LOAD_REFERENCE_DATA", entries });
      },
      onLoadPolicy: (rules) => {
        dispatch({ type: "LOAD_POLICY", rules });
      },
      onError: (code: string, message: string) => {
        console.error(`[XFEB Bridge] ${code}: ${message}`);
      },
    });

    bridge.start();
    bridge.sendReady();
    bridgeRef.current = bridge;

    return () => {
      bridge.stop();
      bridgeRef.current = null;
    };
  }, [dispatch]);

  // Send SELECTION_CHANGED when selection changes
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge || !schema) return;

    const metrics: SelectionMetrics = {
      selectedCount: countSelected(schema, selection),
      totalCount: countAll(schema),
      reductionPct: computeReduction(schema, selection),
      estimatedPayloadKb: Math.round(
        schema.reduce((sum, root) => sum + estimateSelectedWeight(root, selection), 0) / 1024,
      ),
    };

    bridge.sendSelectionChanged(metrics);
  }, [schema, selection]);

  // Send FILTER_CHANGED when filter values change
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    const filterEntries = Object.values(filterValues);
    bridge.sendFilterChanged(
      filterEntries.length,
      filterEntries.map((f) => ({ xpath: f.xpath, operator: f.operator })),
    );
  }, [filterValues]);

  // Send POLICY_STATUS when violations change
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    const satisfied = policyViolations.every((v) => v.severity !== "error");
    bridge.sendPolicyStatus(satisfied, policyViolations);
  }, [policyViolations]);

  const sendPackageReady = useCallback(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    /** Encode a UTF-8 string as base64 (handles non-ASCII safely). */
    const toBase64 = (str: string): string => {
      const bytes = new TextEncoder().encode(str);
      let binary = "";
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      return btoa(binary);
    };

    const payload: PackagePayload = {
      filterXml: {
        content: toBase64(filterXml),
        filename: `${slug}-filter.xml`,
        contentType: "application/xml",
      },
      xsltTransform: {
        content: toBase64(xsltOutput),
        filename: `${slug}-transform.xslt`,
        contentType: "application/xml",
      },
      reportDefinition: {
        content: toBase64(reportXml),
        filename: `${slug}-report.xml`,
        contentType: "application/xml",
      },
      templateScaffold: null,
    };

    bridge.sendPackageReady(payload);
  }, [filterXml, xsltOutput, reportXml, slug]);

  const isEmbedded = useMemo(() => {
    try {
      return window !== window.parent;
    } catch {
      return true;
    }
  }, []);

  return { isEmbedded, sendPackageReady };
}
