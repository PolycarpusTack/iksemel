/**
 * PostMessage bridge type definitions.
 *
 * All messages exchanged between the XFEB iframe and the WHATS'ON host
 * are strongly typed as discriminated unions keyed on the `type` field.
 * This enables exhaustive pattern matching in message handlers.
 */

import type { ReferenceDataEntry, PolicyRule, PolicyViolation } from "@/types";

// ─── Payloads ───────────────────────────────────────────────────────────

/**
 * Payload for the PACKAGE_READY outbound message.
 * Contains all files that make up a report package.
 */
export interface PackagePayload {
  readonly filterXml: FilePayload;
  readonly xsltTransform: FilePayload;
  readonly reportDefinition: FilePayload;
  /** Base64-encoded scaffold ZIP for native formats (null for HTML-based formats) */
  readonly templateScaffold: FilePayload | null;
}

/**
 * A single file within a package payload.
 */
export interface FilePayload {
  readonly content: string;
  readonly filename: string;
  readonly contentType: string;
}

/**
 * Payload for the SELECTION_CHANGED outbound message.
 * Reports real-time selection metrics to the host.
 */
export interface SelectionMetrics {
  readonly selectedCount: number;
  readonly totalCount: number;
  readonly reductionPct: number;
  readonly estimatedPayloadKb: number;
}

// ─── Inbound Messages (Host → XFEB) ────────────────────────────────────

/**
 * Load an XSD schema into the XFEB tree view.
 */
export interface LoadSchemaMessage {
  readonly type: "LOAD_SCHEMA";
  readonly payload: {
    readonly xsdContent: string;
    readonly templateId?: string;
  };
}

/**
 * Load a previously saved report configuration for editing.
 */
export interface LoadConfigMessage {
  readonly type: "LOAD_CONFIG";
  readonly payload: {
    readonly reportXml: string;
    readonly filterXml?: string;
    readonly xsltContent?: string;
  };
}

/**
 * Dynamically update the allowed origins whitelist.
 */
export interface SetOriginWhitelistMessage {
  readonly type: "SET_ORIGIN_WHITELIST";
  readonly payload: {
    readonly origins: readonly string[];
  };
}

/**
 * Load reference data (channels, genres, etc.) for filter dropdowns.
 */
export interface LoadReferenceDataMessage {
  readonly type: "LOAD_REFERENCE_DATA";
  readonly payload: {
    readonly entries: readonly ReferenceDataEntry[];
  };
}

/**
 * Load policy rules that constrain filter configuration.
 */
export interface LoadPolicyMessage {
  readonly type: "LOAD_POLICY";
  readonly payload: {
    readonly rules: readonly PolicyRule[];
  };
}

/**
 * Load a document template (styled .xlsx/.docx/.pptx/.ods/.odt) for native formats.
 */
export interface LoadDocumentTemplateMessage {
  readonly type: "LOAD_DOCUMENT_TEMPLATE";
  readonly payload: {
    readonly fileContent: string; // base64-encoded
    readonly filename: string;
  };
}

/**
 * Discriminated union of all messages the host can send to XFEB.
 */
export type InboundMessage =
  | LoadSchemaMessage
  | LoadConfigMessage
  | SetOriginWhitelistMessage
  | LoadReferenceDataMessage
  | LoadPolicyMessage
  | LoadDocumentTemplateMessage;

// ─── Outbound Messages (XFEB → Host) ───────────────────────────────────

/**
 * Sent when the user finalises a report package.
 */
export interface PackageReadyMessage {
  readonly type: "PACKAGE_READY";
  readonly payload: PackagePayload;
}

/**
 * Sent (debounced) when the user changes field selection.
 */
export interface SelectionChangedMessage {
  readonly type: "SELECTION_CHANGED";
  readonly payload: SelectionMetrics;
}

/**
 * Sent once on startup to signal the bridge is operational.
 */
export interface XfebReadyMessage {
  readonly type: "XFEB_READY";
  readonly payload: {
    readonly version: string;
  };
}

/**
 * Sent when an unrecoverable error occurs in XFEB.
 */
export interface ErrorMessage {
  readonly type: "ERROR";
  readonly payload: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Sent (debounced) when the user changes filter values.
 */
export interface FilterChangedMessage {
  readonly type: "FILTER_CHANGED";
  readonly payload: {
    readonly filterCount: number;
    readonly filters: readonly { readonly xpath: string; readonly operator: string }[];
  };
}

/**
 * Sent when policy evaluation completes.
 */
export interface PolicyStatusMessage {
  readonly type: "POLICY_STATUS";
  readonly payload: {
    readonly satisfied: boolean;
    readonly violations: readonly PolicyViolation[];
  };
}

/**
 * Discriminated union of all messages XFEB can send to the host.
 */
export type OutboundMessage =
  | PackageReadyMessage
  | SelectionChangedMessage
  | XfebReadyMessage
  | ErrorMessage
  | FilterChangedMessage
  | PolicyStatusMessage;

// ─── Combined ───────────────────────────────────────────────────────────

/**
 * Union of every message type that can flow through the bridge.
 */
export type BridgeMessage = InboundMessage | OutboundMessage;

/**
 * Known inbound message type strings (for runtime validation).
 */
export const INBOUND_MESSAGE_TYPES: ReadonlySet<string> = new Set([
  "LOAD_SCHEMA",
  "LOAD_CONFIG",
  "SET_ORIGIN_WHITELIST",
  "LOAD_REFERENCE_DATA",
  "LOAD_POLICY",
  "LOAD_DOCUMENT_TEMPLATE",
]);
