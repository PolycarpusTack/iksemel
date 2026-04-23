/**
 * PostMessage bridge — core message handler.
 *
 * Provides a standalone (zero-React) communication layer between the
 * XFEB iframe/popup and the WHATS'ON host application. All interaction
 * is callback-driven: the bridge dispatches inbound messages to
 * handler functions and exposes methods for sending outbound messages.
 *
 * Lifecycle:
 *   1. `createBridge(config)` — construct with callbacks
 *   2. `bridge.start()`       — attach window message listener
 *   3. `bridge.sendReady()`   — signal readiness to host
 *   4. (handle messages / send responses)
 *   5. `bridge.stop()`        — detach listener, clean up timers
 */

import type {
  PackagePayload,
  SelectionMetrics,
  InboundMessage,
  OutboundMessage,
} from "./types";
import type { ReferenceDataEntry, PolicyRule, PolicyViolation } from "@/types";
import { INBOUND_MESSAGE_TYPES } from "./types";
import { createOriginValidator } from "./origin-validator";
import type { OriginValidator } from "./origin-validator";
import { bridgeDebug } from "./log";

// ─── Configuration ──────────────────────────────────────────────────────

/**
 * Configuration for the PostMessage bridge.
 * All callback properties are optional — unhandled message types
 * are silently ignored.
 */
export interface BridgeConfig {
  /** Additional origins to whitelist beyond the defaults. */
  readonly origins?: readonly string[];
  /** Called when the host sends a LOAD_SCHEMA message. */
  readonly onLoadSchema?: (xsdContent: string, templateId?: string) => void;
  /** Called when the host sends a LOAD_CONFIG message. */
  readonly onLoadConfig?: (
    reportXml: string,
    filterXml?: string,
    xsltContent?: string,
  ) => void;
  /** Called when the host sends a LOAD_REFERENCE_DATA message. */
  readonly onLoadReferenceData?: (entries: readonly ReferenceDataEntry[]) => void;
  /** Called when the host sends a LOAD_POLICY message. */
  readonly onLoadPolicy?: (rules: readonly PolicyRule[]) => void;
  /** Called when the host sends a LOAD_DOCUMENT_TEMPLATE message. */
  readonly onLoadDocumentTemplate?: (fileContent: string, filename: string) => void;
  /** Called when an error occurs in a message handler. */
  readonly onError?: (code: string, message: string) => void;
}

// ─── Bridge Interface ───────────────────────────────────────────────────

/**
 * The bridge API returned by `createBridge`.
 */
export interface Bridge {
  /** Start listening for messages. */
  start(): void;
  /** Stop listening for messages and clean up timers. */
  stop(): void;
  /** Send a PACKAGE_READY message to the host. */
  sendPackageReady(payload: PackagePayload): void;
  /** Send a SELECTION_CHANGED message to the host (debounced 200ms). */
  sendSelectionChanged(metrics: SelectionMetrics): void;
  /** Send an XFEB_READY message to the host. */
  sendReady(): void;
  /** Send an ERROR message to the host. */
  sendError(code: string, message: string): void;
  /** Send a FILTER_CHANGED message to the host (debounced 200ms). */
  sendFilterChanged(filterCount: number, filters: readonly { xpath: string; operator: string }[]): void;
  /** Send a POLICY_STATUS message to the host. */
  sendPolicyStatus(satisfied: boolean, violations: readonly PolicyViolation[]): void;
  /** Returns `true` if XFEB is running inside an iframe or popup. */
  isEmbedded(): boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────

/** Debounce delay for SELECTION_CHANGED messages (ms). */
const SELECTION_DEBOUNCE_MS = 200;

/** XFEB version reported in XFEB_READY messages — injected by Vite from package.json. */
declare const __XFEB_VERSION__: string;
const XFEB_VERSION: string = typeof __XFEB_VERSION__ !== "undefined" ? __XFEB_VERSION__ : "0.0.0";

// ─── Factory ────────────────────────────────────────────────────────────

/**
 * Creates a new PostMessage bridge instance.
 *
 * @param config - Bridge configuration with callbacks and origin whitelist
 * @returns A Bridge instance ready to be started
 *
 * @example
 * ```ts
 * const bridge = createBridge({
 *   origins: ["https://whatson.example.com"],
 *   onLoadSchema: (xsd) => parseAndDisplay(xsd),
 *   onLoadConfig: (xml) => restoreState(xml),
 * });
 * bridge.start();
 * bridge.sendReady();
 * ```
 */
export function createBridge(config: BridgeConfig): Bridge {
  const validator: OriginValidator = createOriginValidator(
    config.origins ? [...config.origins] : undefined,
  );

  let selectionTimer: ReturnType<typeof setTimeout> | null = null;
  let filterTimer: ReturnType<typeof setTimeout> | null = null;
  let messageListener: ((event: MessageEvent) => void) | null = null;
  /** The origin of the last successfully validated inbound message. */
  let lastKnownOrigin: string | null = null;

  // ── Inbound message handler ─────────────────────────────────────────

  function handleMessage(event: MessageEvent): void {
    // Reject null/empty origins
    if (!event.origin) {
      return;
    }

    // Origin check
    if (!validator.isAllowed(event.origin)) {
      bridgeDebug(
        `[XFEB Bridge] Rejected message from origin: ${event.origin}`,
      );
      return;
    }

    // Basic structural validation
    const data: unknown = event.data;
    if (
      data === null ||
      data === undefined ||
      typeof data !== "object" ||
      Array.isArray(data)
    ) {
      bridgeDebug("[XFEB Bridge] Ignored non-object message data");
      return;
    }

    const msg = data as Record<string, unknown>;

    if (typeof msg["type"] !== "string") {
      bridgeDebug("[XFEB Bridge] Ignored message with missing/invalid type");
      return;
    }

    const type = msg["type"];

    // Only process known inbound types
    if (!INBOUND_MESSAGE_TYPES.has(type)) {
      bridgeDebug(`[XFEB Bridge] Ignored unknown message type: ${type}`);
      return;
    }

    // Payload must exist
    if (
      msg["payload"] === null ||
      msg["payload"] === undefined ||
      typeof msg["payload"] !== "object"
    ) {
      bridgeDebug(
        `[XFEB Bridge] Ignored message with missing/invalid payload: ${type}`,
      );
      return;
    }

    // Track the origin of successfully validated messages
    lastKnownOrigin = event.origin;

    try {
      dispatchMessage({ type, payload: msg["payload"] } as InboundMessage);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown handler error";
      console.error(`[XFEB Bridge] Error in handler for ${type}:`, err);
      config.onError?.("HANDLER_ERROR", errorMessage);
    }
  }

  function dispatchMessage(message: InboundMessage): void {
    switch (message.type) {
      case "LOAD_SCHEMA": {
        config.onLoadSchema?.(
          message.payload.xsdContent,
          message.payload.templateId,
        );
        break;
      }
      case "LOAD_CONFIG": {
        config.onLoadConfig?.(
          message.payload.reportXml,
          message.payload.filterXml,
          message.payload.xsltContent,
        );
        break;
      }
      case "SET_ORIGIN_WHITELIST": {
        for (const origin of message.payload.origins) {
          if (origin !== "*") {
            validator.addOrigin(origin);
          }
        }
        break;
      }
      case "LOAD_REFERENCE_DATA": {
        config.onLoadReferenceData?.(message.payload.entries);
        break;
      }
      case "LOAD_POLICY": {
        config.onLoadPolicy?.(message.payload.rules);
        break;
      }
      case "LOAD_DOCUMENT_TEMPLATE": {
        config.onLoadDocumentTemplate?.(
          message.payload.fileContent,
          message.payload.filename,
        );
        break;
      }
    }
  }

  // ── Outbound message sending ────────────────────────────────────────

  function sendToHost(message: OutboundMessage): void {
    const target = getHostWindow();
    if (!target) {
      bridgeDebug(
        "[XFEB Bridge] Cannot send message — not running in embedded mode",
      );
      return;
    }
    const targetOrigin = lastKnownOrigin ?? "*";
    target.postMessage(message, targetOrigin);
  }

  function getHostWindow(): Window | null {
    // Try iframe parent first
    try {
      if (window !== window.parent) {
        return window.parent;
      }
    } catch {
      // Cross-origin parent — still an iframe
      return window.parent;
    }

    // Try popup opener
    if (window.opener) {
      return window.opener as Window;
    }

    return null;
  }

  // ── Public API ──────────────────────────────────────────────────────

  return {
    start(): void {
      if (messageListener) {
        return; // Already started
      }
      messageListener = handleMessage;
      window.addEventListener("message", messageListener);
    },

    stop(): void {
      if (messageListener) {
        window.removeEventListener("message", messageListener);
        messageListener = null;
      }
      if (selectionTimer !== null) {
        clearTimeout(selectionTimer);
        selectionTimer = null;
      }
      if (filterTimer !== null) {
        clearTimeout(filterTimer);
        filterTimer = null;
      }
    },

    sendPackageReady(payload: PackagePayload): void {
      sendToHost({ type: "PACKAGE_READY", payload });
    },

    sendSelectionChanged(metrics: SelectionMetrics): void {
      if (selectionTimer !== null) {
        clearTimeout(selectionTimer);
      }
      selectionTimer = setTimeout(() => {
        selectionTimer = null;
        sendToHost({ type: "SELECTION_CHANGED", payload: metrics });
      }, SELECTION_DEBOUNCE_MS);
    },

    sendReady(): void {
      sendToHost({ type: "XFEB_READY", payload: { version: XFEB_VERSION } });
    },

    sendError(code: string, message: string): void {
      sendToHost({ type: "ERROR", payload: { code, message } });
    },

    sendFilterChanged(filterCount: number, filters: readonly { xpath: string; operator: string }[]): void {
      if (filterTimer !== null) {
        clearTimeout(filterTimer);
      }
      filterTimer = setTimeout(() => {
        filterTimer = null;
        sendToHost({ type: "FILTER_CHANGED", payload: { filterCount, filters } });
      }, SELECTION_DEBOUNCE_MS);
    },

    sendPolicyStatus(satisfied: boolean, violations: readonly PolicyViolation[]): void {
      sendToHost({ type: "POLICY_STATUS", payload: { satisfied, violations } });
    },

    isEmbedded(): boolean {
      try {
        return window !== window.parent;
      } catch {
        // Cross-origin parent — we are in an iframe
        return true;
      }
    },
  };
}
