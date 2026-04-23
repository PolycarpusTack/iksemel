import { useCallback, useMemo } from "react";
import type { Dispatch } from "react";
import type { AppAction } from "@/state";
import type { FilterValue, FilterValuesState, SchemaNode } from "@/types";

function findNode(nodeId: string, nodes: readonly SchemaNode[]): SchemaNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    if (node.children.length > 0) {
      const found = findNode(nodeId, node.children);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function findNodePath(nodeId: string, nodes: readonly SchemaNode[]): readonly string[] {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return [];
    }

    if (node.children.length > 0) {
      const childPath = findNodePath(nodeId, node.children);
      if (childPath.length > 0 || node.children.some((child) => child.id === nodeId)) {
        return [node.name, ...childPath];
      }
    }
  }

  return [];
}

export interface FilterPanelState {
  readonly focusedNode: SchemaNode | null;
  readonly focusedNodePath: readonly string[];
  readonly filterCount: number;
  readonly filteredNodeIds: ReadonlySet<string>;
  handleFocusNode(nodeId: string): void;
  handleSetFilter(nodeId: string, filter: FilterValue): void;
  handleRemoveFilter(nodeId: string): void;
  handleCloseFilterPanel(): void;
}

interface FilterPanelInput {
  readonly schema: readonly SchemaNode[] | null;
  readonly focusedNodeId: string | null;
  readonly filterValues: FilterValuesState;
  readonly dispatch: Dispatch<AppAction>;
}

export function useFilterPanelState(input: FilterPanelInput): FilterPanelState {
  const { schema, focusedNodeId, filterValues, dispatch } = input;

  const focusedNode = useMemo(() => {
    if (!focusedNodeId || !schema) {
      return null;
    }
    return findNode(focusedNodeId, schema);
  }, [focusedNodeId, schema]);

  const focusedNodePath = useMemo(() => {
    if (!focusedNodeId || !schema) {
      return [];
    }
    return findNodePath(focusedNodeId, schema);
  }, [focusedNodeId, schema]);

  const filterCount = useMemo(() => Object.keys(filterValues).length, [filterValues]);

  const filteredNodeIds = useMemo(() => new Set(Object.keys(filterValues)), [filterValues]);

  const handleFocusNode = useCallback((nodeId: string) => {
    dispatch({ type: "SET_FOCUSED_NODE", nodeId });
  }, [dispatch]);

  const handleSetFilter = useCallback((nodeId: string, filter: FilterValue) => {
    dispatch({ type: "SET_FILTER_VALUE", nodeId, filter });
  }, [dispatch]);

  const handleRemoveFilter = useCallback((nodeId: string) => {
    dispatch({ type: "REMOVE_FILTER_VALUE", nodeId });
  }, [dispatch]);

  const handleCloseFilterPanel = useCallback(() => {
    dispatch({ type: "SET_FOCUSED_NODE", nodeId: null });
  }, [dispatch]);

  return {
    focusedNode,
    focusedNodePath,
    filterCount,
    filteredNodeIds,
    handleFocusNode,
    handleSetFilter,
    handleRemoveFilter,
    handleCloseFilterPanel,
  };
}
