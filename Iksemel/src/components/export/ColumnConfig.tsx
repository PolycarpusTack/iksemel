import { useCallback, useRef, useState } from "react";
import type { ColumnDefinition, SelectedLeaf } from "@/types";
import { Button, Input, Select } from "@components/primitives";
import styles from "./ColumnConfig.module.css";

interface ColumnConfigProps {
  columns: readonly ColumnDefinition[];
  selectedLeaves: readonly SelectedLeaf[];
  orphanedColumns?: readonly ColumnDefinition[];
  onColumnsChange: (columns: ColumnDefinition[]) => void;
}

const FORMAT_OPTIONS = ["auto", "text", "date", "datetime", "number"] as const;
const ALIGN_OPTIONS = ["left", "center", "right"] as const;

export function ColumnConfig({ columns, selectedLeaves, orphanedColumns = [], onColumnsChange }: ColumnConfigProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const updateColumn = useCallback(
    (index: number, patch: Partial<ColumnDefinition>) => {
      const next = columns.map((col, i) => (i === index ? { ...col, ...patch } : col));
      onColumnsChange(next);
    },
    [columns, onColumnsChange],
  );

  const moveColumn = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= columns.length) return;
      const next = [...columns];
      const temp = next[index]!;
      next[index] = next[target]!;
      next[target] = temp;
      onColumnsChange(next);
    },
    [columns, onColumnsChange],
  );

  const removeColumn = useCallback(
    (index: number) => {
      onColumnsChange(columns.filter((_, i) => i !== index));
    },
    [columns, onColumnsChange],
  );

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const next = [...columns];
      const [moved] = next.splice(dragIndex, 1);
      if (moved) {
        next.splice(dragOverIndex, 0, moved);
        onColumnsChange(next);
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, [dragIndex, dragOverIndex, columns, onColumnsChange]);

  const autoPopulate = useCallback(() => {
    const newCols: ColumnDefinition[] = selectedLeaves.map((leaf) => ({
      id: leaf.id,
      xpath: leaf.xpath,
      header: leaf.name,
      format: "auto" as const,
      align: "left" as const,
      width: 120,
      fullPath: leaf.path.join("/"),
    }));
    onColumnsChange(newCols);
  }, [selectedLeaves, onColumnsChange]);

  const clearAll = useCallback(() => {
    onColumnsChange([]);
  }, [onColumnsChange]);

  const smartOrder = useCallback(() => {
    const TYPE_PRIORITY: Record<string, number> = {
      integer: 1, int: 1, long: 1, short: 1, positiveInteger: 1, nonNegativeInteger: 1,
      date: 2, dateTime: 2, time: 2, gYear: 2, gMonth: 2, gDay: 2,
      duration: 3,
      boolean: 4,
      decimal: 5, float: 5, double: 5,
      string: 6, normalizedString: 6, token: 6,
    };
    const sorted = [...columns].sort((a, b) => {
      const aLeaf = selectedLeaves.find((l) => l.id === a.id);
      const bLeaf = selectedLeaves.find((l) => l.id === b.id);
      const aPriority = TYPE_PRIORITY[aLeaf?.typeName ?? "string"] ?? 6;
      const bPriority = TYPE_PRIORITY[bLeaf?.typeName ?? "string"] ?? 6;
      return aPriority - bPriority;
    });
    onColumnsChange(sorted);
  }, [columns, selectedLeaves, onColumnsChange]);

  return (
    <div className={styles["container"]}>
      <div className={styles["toolbar"]}>
        <Button size="sm" variant="success" onClick={autoPopulate}>
          Auto-populate
        </Button>
        <Button size="sm" variant="ghost" onClick={clearAll} disabled={columns.length === 0}>
          Clear
        </Button>
        <Button size="sm" variant="ghost" onClick={smartOrder} disabled={columns.length < 2} aria-label="Reorder columns by type priority">
          Smart Order
        </Button>
      </div>

      {orphanedColumns.length > 0 && (
        <div className={styles["orphanWarning"]} role="alert">
          {orphanedColumns.length} {orphanedColumns.length === 1 ? "column references" : "columns reference"} a deselected field:{" "}
          {orphanedColumns.map((c) => c.header).join(", ")}
        </div>
      )}

      {columns.length === 0 ? (
        <div className={styles["empty"]}>
          No columns configured. Click Auto-populate or add columns from the tree.
        </div>
      ) : (
        <ul className={styles["list"]} aria-label="Column configuration">
          {columns.map((col, index) => (
            <ColumnRow
              key={col.id}
              column={col}
              index={index}
              total={columns.length}
              onUpdate={(patch) => updateColumn(index, patch)}
              onMove={(dir) => moveColumn(index, dir)}
              onRemove={() => removeColumn(index)}
              isDragging={dragIndex === index}
              isDragOver={dragOverIndex === index && dragIndex !== index}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Column Row sub-component ────────────────────────────────── */

interface ColumnRowProps {
  column: ColumnDefinition;
  index: number;
  total: number;
  onUpdate: (patch: Partial<ColumnDefinition>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function ColumnRow({
  column, index, total, onUpdate, onMove, onRemove,
  isDragging, isDragOver, onDragStart, onDragOver, onDragEnd,
}: ColumnRowProps) {
  const rowClass = [
    styles["row"],
    isDragging ? styles["rowDragging"] : "",
    isDragOver ? styles["rowDragOver"] : "",
  ].filter(Boolean).join(" ");

  return (
    <li
      className={rowClass}
      aria-label={`Column: ${column.header}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className={styles["moveGroup"]}>
        <button
          className={styles["moveBtn"]}
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label={`Move ${column.header} up`}
        >
          ^
        </button>
        <button
          className={styles["moveBtn"]}
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label={`Move ${column.header} down`}
        >
          v
        </button>
      </div>

      <span className={styles["grip"]} aria-hidden="true">&#x2630;</span>

      <Input
        compact
        className={styles["headerInput"]}
        value={column.header}
        onChange={(e) => onUpdate({ header: (e.target as HTMLInputElement).value })}
        aria-label={`Header for column ${index + 1}`}
      />

      <span className={styles["xpath"]} title={column.xpath}>{column.xpath}</span>

      <Select
        compact
        className={styles["compactSelect"]}
        value={column.format}
        onChange={(e) =>
          onUpdate({ format: e.target.value as ColumnDefinition["format"] })
        }
        aria-label={`Format for ${column.header}`}
      >
        {FORMAT_OPTIONS.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </Select>

      <Select
        compact
        className={styles["compactSelect"]}
        value={column.align}
        onChange={(e) =>
          onUpdate({ align: e.target.value as ColumnDefinition["align"] })
        }
        aria-label={`Alignment for ${column.header}`}
      >
        {ALIGN_OPTIONS.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </Select>

      <Input
        compact
        type="number"
        className={styles["widthInput"]}
        value={column.width}
        onChange={(e) =>
          onUpdate({ width: Number((e.target as HTMLInputElement).value) || 0 })
        }
        aria-label={`Width for ${column.header}`}
      />

      <button
        className={styles["removeBtn"]}
        onClick={onRemove}
        aria-label={`Remove column ${column.header}`}
      >
        x
      </button>
    </li>
  );
}
