import { useCallback, useMemo, type ReactNode } from "react";
import { Button } from "@components/primitives";
import { useToast } from "@components/shared/Toast";
import styles from "./CodeViewer.module.css";

interface CodeViewerProps {
  code: string;
  filename: string;
  language: "xml" | "xslt";
}

export function CodeViewer({ code, filename, language }: CodeViewerProps) {
  const { addToast } = useToast();

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      addToast("Copied to clipboard");
    } catch {
      addToast("Failed to copy", "error");
    }
  }, [code, addToast]);

  const download = useCallback(() => {
    const ext = language === "xslt" ? ".xslt" : ".xml";
    const name = filename.endsWith(ext) ? filename : `${filename}${ext}`;
    const blob = new Blob([code], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${name}`);
  }, [code, filename, language, addToast]);

  const lines = useMemo(() => code.split("\n"), [code]);

  if (!code) {
    return (
      <div className={styles["container"]}>
        <div className={styles["empty"]}>No code generated yet.</div>
      </div>
    );
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["toolbar"]}>
        <span className={styles["filename"]}>{filename}</span>
        <Button size="sm" variant="ghost" onClick={() => { void copyToClipboard(); }}>
          Copy
        </Button>
        <Button size="sm" variant="ghost" onClick={download}>
          Download
        </Button>
      </div>

      <div className={styles["codeWrap"]} role="region" aria-label={`${language.toUpperCase()} code`}>
        <div className={styles["codeTable"]}>
          {lines.map((line, i) => (
            <div key={i} className={styles["codeLine"]}>
              <span className={styles["lineNumber"]}>{i + 1}</span>
              <span className={styles["lineContent"]}>
                {highlightXml(line)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Simple regex-based XML syntax highlighter ──────────────── */

/**
 * Highlights a single line of XML using CSS classes.
 * Handles comments, processing instructions, tags, attributes, and values.
 */
function highlightXml(line: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    // Comment
    const commentMatch = remaining.match(/^(<!--[\s\S]*?-->)/);
    if (commentMatch?.[1]) {
      parts.push(<span key={key++} className={styles["comment"]}>{commentMatch[1]}</span>);
      remaining = remaining.slice(commentMatch[1].length);
      continue;
    }

    // Processing instruction
    const piMatch = remaining.match(/^(<\?[\s\S]*?\?>)/);
    if (piMatch?.[1]) {
      parts.push(<span key={key++} className={styles["pi"]}>{piMatch[1]}</span>);
      remaining = remaining.slice(piMatch[1].length);
      continue;
    }

    // Opening/closing/self-closing tag
    const tagMatch = remaining.match(/^(<\/?[\w:.-]+)/);
    if (tagMatch?.[1]) {
      parts.push(<span key={key++} className={styles["tag"]}>{tagMatch[1]}</span>);
      remaining = remaining.slice(tagMatch[1].length);
      // Parse attributes within the tag
      const result = parseAttributes(remaining, key);
      parts.push(...result.nodes);
      key = result.nextKey;
      remaining = result.remaining;
      continue;
    }

    // Tag close bracket
    const closeBracket = remaining.match(/^(\s*\/?>)/);
    if (closeBracket?.[1]) {
      parts.push(<span key={key++} className={styles["tag"]}>{closeBracket[1]}</span>);
      remaining = remaining.slice(closeBracket[1].length);
      continue;
    }

    // Plain text until next special char
    const textMatch = remaining.match(/^([^<]+)/);
    if (textMatch?.[1]) {
      parts.push(<span key={key++}>{textMatch[1]}</span>);
      remaining = remaining.slice(textMatch[1].length);
      continue;
    }

    // Fallback: consume one character
    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return <>{parts}</>;
}

interface AttrParseResult {
  nodes: ReactNode[];
  remaining: string;
  nextKey: number;
}

function parseAttributes(input: string, startKey: number): AttrParseResult {
  const nodes: ReactNode[] = [];
  let remaining = input;
  let key = startKey;

  while (remaining.length > 0) {
    // Whitespace + attribute name
    const attrMatch = remaining.match(/^(\s+)([\w:.-]+)/);
    if (attrMatch?.[1] !== undefined && attrMatch[2]) {
      nodes.push(<span key={key++}>{attrMatch[1]}</span>);
      nodes.push(<span key={key++} className={styles["attrName"]}>{attrMatch[2]}</span>);
      remaining = remaining.slice(attrMatch[0].length);

      // =value
      const valMatch = remaining.match(/^(=)("(?:[^"]*)")/);
      if (valMatch?.[1] && valMatch[2]) {
        nodes.push(<span key={key++}>{valMatch[1]}</span>);
        nodes.push(<span key={key++} className={styles["attrValue"]}>{valMatch[2]}</span>);
        remaining = remaining.slice(valMatch[0].length);
      }
      continue;
    }

    // End of tag
    const endMatch = remaining.match(/^(\s*\/?>)/);
    if (endMatch?.[1]) {
      nodes.push(<span key={key++} className={styles["tag"]}>{endMatch[1]}</span>);
      remaining = remaining.slice(endMatch[1].length);
      break;
    }

    // Nothing matched — break out
    break;
  }

  return { nodes, remaining, nextKey: key };
}
