import { bridgeSecurityWarn } from "./log";

/**
 * Origin validation for the PostMessage bridge.
 *
 * Ensures that only messages from explicitly whitelisted origins
 * are processed. Origins must match exactly (protocol + host + port).
 *
 * A wildcard `"*"` entry allows all origins — intended for development
 * only and emits a console warning when activated.
 */

/**
 * Default origins allowed in development.
 */
const DEFAULT_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "http://localhost:5173",
];

/**
 * Origin validator interface.
 * Manages a set of allowed origins and tests incoming origins against them.
 */
export interface OriginValidator {
  /** Returns `true` if the given origin is in the whitelist. */
  isAllowed(origin: string): boolean;
  /** Adds an origin to the whitelist. */
  addOrigin(origin: string): void;
  /** Removes an origin from the whitelist. */
  removeOrigin(origin: string): void;
  /** Returns a snapshot of the current whitelist. */
  getOrigins(): readonly string[];
}

/**
 * Creates an origin validator with the default origins plus any
 * additional origins supplied at construction time.
 *
 * @param additionalOrigins - Extra origins to whitelist beyond the defaults
 * @returns A new OriginValidator instance
 *
 * @example
 * ```ts
 * const validator = createOriginValidator(["https://whatson.example.com"]);
 * validator.isAllowed("https://whatson.example.com"); // true
 * validator.isAllowed("https://evil.com");            // false
 * ```
 */
export function createOriginValidator(
  additionalOrigins?: readonly string[],
): OriginValidator {
  const origins = new Set<string>([
    ...DEFAULT_ORIGINS,
    ...(additionalOrigins ?? []),
  ]);

  let wildcardWarned = false;

  return {
    isAllowed(origin: string): boolean {
      // Null, undefined, or empty origins are always rejected
      if (!origin) {
        return false;
      }

      // Wildcard allows everything (dev mode only)
      if (origins.has("*")) {
        if (!wildcardWarned) {
          bridgeSecurityWarn(
            "[XFEB Bridge] Wildcard origin '*' is active — all origins are allowed. " +
              "This should only be used during development.",
          );
          wildcardWarned = true;
        }
        return true;
      }

      // Exact match only — no substring, no regex
      return origins.has(origin);
    },

    addOrigin(origin: string): void {
      if (origin) {
        origins.add(origin);
        // Reset wildcard warning flag if wildcard was just added
        if (origin === "*") {
          wildcardWarned = false;
        }
      }
    },

    removeOrigin(origin: string): void {
      origins.delete(origin);
    },

    getOrigins(): readonly string[] {
      return [...origins];
    },
  };
}
