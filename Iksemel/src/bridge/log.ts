export function isBridgeDebugEnabled(): boolean {
  return import.meta.env.VITE_BRIDGE_DEBUG === "true";
}

export function bridgeDebug(message: string, ...args: readonly unknown[]): void {
  if (!isBridgeDebugEnabled()) {
    return;
  }
  console.debug(message, ...args);
}

export function bridgeWarn(message: string, ...args: readonly unknown[]): void {
  if (!isBridgeDebugEnabled()) {
    return;
  }
  console.warn(message, ...args);
}

/** Security-relevant warnings that must be emitted in all environments. */
export function bridgeSecurityWarn(message: string, ...args: readonly unknown[]): void {
  console.warn(message, ...args);
}
