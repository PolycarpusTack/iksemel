import { memo } from "react";
import styles from "./TypeBadge.module.css";

/** XSD type-name strings that map to the "string" colour group. */
const STRING_TYPES = new Set([
  "string",
  "normalizedString",
  "token",
  "Name",
  "NCName",
  "NMTOKEN",
  "language",
  "ID",
  "IDREF",
  "anyURI",
  "base64Binary",
  "hexBinary",
]);

/** XSD type-name strings that map to the "datetime" colour group. */
const DATETIME_TYPES = new Set([
  "date",
  "dateTime",
  "time",
  "gYear",
  "gYearMonth",
  "gMonth",
  "gMonthDay",
  "gDay",
  "duration",
]);

/** XSD type-name strings that map to the "numeric" colour group. */
const NUMERIC_TYPES = new Set([
  "integer",
  "int",
  "long",
  "short",
  "byte",
  "decimal",
  "float",
  "double",
  "positiveInteger",
  "nonNegativeInteger",
  "negativeInteger",
  "nonPositiveInteger",
  "unsignedInt",
  "unsignedLong",
  "unsignedShort",
  "unsignedByte",
]);

interface TypeBadgeProps {
  typeName: string;
}

function getColourClass(typeName: string): string {
  if (STRING_TYPES.has(typeName)) return styles["string"] ?? "";
  if (DATETIME_TYPES.has(typeName)) return styles["datetime"] ?? "";
  if (NUMERIC_TYPES.has(typeName)) return styles["numeric"] ?? "";
  if (typeName === "boolean") return styles["boolean"] ?? "";
  return styles["complex"] ?? "";
}

/**
 * Small badge displaying the XSD type name with colour coding.
 */
export const TypeBadge = memo(function TypeBadge({ typeName }: TypeBadgeProps) {
  const colourClass = getColourClass(typeName);

  return (
    <span className={`${styles["badge"]} ${colourClass}`}>
      {typeName || "complex"}
    </span>
  );
});
