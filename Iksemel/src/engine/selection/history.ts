/**
 * Undo/redo history management for selection state.
 *
 * Maintains a stack of selection snapshots with a configurable
 * maximum history size. All operations are immutable.
 */

import type { SelectionState } from "@/types";

/** Maximum number of undo steps */
const MAX_HISTORY_SIZE = 50;

/**
 * History state containing past states, current state, and future states (for redo).
 */
export interface SelectionHistory {
  readonly past: readonly SelectionState[];
  readonly present: SelectionState;
  readonly future: readonly SelectionState[];
}

/**
 * Creates an initial history with the given state.
 */
export function createHistory(initial: SelectionState): SelectionHistory {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

/**
 * Pushes a new state onto the history.
 * Clears the future (redo is no longer possible after a new action).
 * Trims the past to respect the maximum history size.
 */
export function pushState(
  history: SelectionHistory,
  newState: SelectionState,
): SelectionHistory {
  const past = [...history.past, history.present];
  // Trim oldest entries if exceeding limit
  while (past.length > MAX_HISTORY_SIZE) {
    past.shift();
  }

  return {
    past,
    present: newState,
    future: [],
  };
}

/**
 * Undoes the last action by moving the present to the future
 * and restoring the most recent past state.
 *
 * @returns Updated history, or the same history if nothing to undo
 */
export function undo(history: SelectionHistory): SelectionHistory {
  if (history.past.length === 0) return history;

  const past = [...history.past];
  const previous = past.pop();
  if (!previous) return history;

  return {
    past,
    present: previous,
    future: [history.present, ...history.future],
  };
}

/**
 * Redoes the last undone action by moving the first future state
 * to the present and pushing the current present to the past.
 *
 * @returns Updated history, or the same history if nothing to redo
 */
export function redo(history: SelectionHistory): SelectionHistory {
  if (history.future.length === 0) return history;

  const [next, ...remainingFuture] = history.future;
  if (!next) return history;

  return {
    past: [...history.past, history.present],
    present: next,
    future: remainingFuture,
  };
}

/**
 * Returns whether undo is available.
 */
export function canUndo(history: SelectionHistory): boolean {
  return history.past.length > 0;
}

/**
 * Returns whether redo is available.
 */
export function canRedo(history: SelectionHistory): boolean {
  return history.future.length > 0;
}
