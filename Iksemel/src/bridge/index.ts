/**
 * PostMessage communication bridge module.
 *
 * Provides a standalone, event-driven communication layer between the
 * XFEB application (running in an iframe or popup) and the WHATS'ON
 * host application. Zero React dependencies — all interaction is
 * callback-driven.
 *
 * @example
 * ```ts
 * import { createBridge, parseReportConfig } from "@/bridge";
 *
 * const bridge = createBridge({
 *   origins: ["https://whatson.example.com"],
 *   onLoadSchema: (xsd) => parseAndDisplay(xsd),
 *   onLoadConfig: (xml) => {
 *     const config = parseReportConfig(xml);
 *     restoreState(config);
 *   },
 * });
 *
 * bridge.start();
 * bridge.sendReady();
 * ```
 */

// Types
export type {
  InboundMessage,
  OutboundMessage,
  BridgeMessage,
  LoadSchemaMessage,
  LoadConfigMessage,
  SetOriginWhitelistMessage,
  LoadReferenceDataMessage,
  LoadPolicyMessage,
  PackageReadyMessage,
  SelectionChangedMessage,
  XfebReadyMessage,
  ErrorMessage,
  FilterChangedMessage,
  PolicyStatusMessage,
  PackagePayload,
  FilePayload,
  SelectionMetrics,
} from "./types";
export { INBOUND_MESSAGE_TYPES } from "./types";

// Origin validator
export type { OriginValidator } from "./origin-validator";
export { createOriginValidator } from "./origin-validator";

// Message handler (bridge)
export type { BridgeConfig, Bridge } from "./message-handler";
export { createBridge } from "./message-handler";

// Config parser
export type { ParsedConfig } from "./config-parser";
export { parseReportConfig } from "./config-parser";

// React hook
export { useBridge } from "./useBridge";
