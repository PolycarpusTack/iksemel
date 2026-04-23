import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@components/primitives";
import { useToast } from "@components/shared/Toast";
import { CodeViewer } from "./CodeViewer";
import styles from "./CodeViewer.module.css";

interface MonacoCodeViewerProps {
  code: string;
  filename: string;
  language: "xml" | "xslt";
}

type MonacoEditor = {
  readonly dispose: () => void;
  readonly setValue: (value: string) => void;
  readonly getAction?: (id: string) => { run: () => Promise<void> } | null;
  readonly updateOptions?: (options: Record<string, unknown>) => void;
  readonly trigger?: (source: string, handlerId: string, payload?: unknown) => void;
};

type MonacoModule = {
  readonly editor?: {
    create: (el: HTMLElement, options: Record<string, unknown>) => MonacoEditor;
  };
};

const dynamicImportModule = new Function("modulePath", "return import(modulePath)") as
  (modulePath: string) => Promise<unknown>;

export function resolveCodeViewerMode(mode: string | undefined): "classic" | "monaco" {
  return mode === "monaco" ? "monaco" : "classic";
}

function prefersMonaco(): boolean {
  return resolveCodeViewerMode(import.meta.env.VITE_CODE_VIEWER) === "monaco";
}

function formatXmlText(input: string): string {
  const normalized = input
    .replace(/\r\n/g, "\n")
    .replace(/>\s+</g, "><")
    .trim();

  if (!normalized) {
    return "";
  }

  const tokens = normalized
    .replace(/(>)(<)(\/*)/g, "$1\n$2$3")
    .split("\n")
    .filter(Boolean);

  let indent = 0;
  const lines: string[] = [];

  for (const token of tokens) {
    const line = token.trim();
    const isClosing = /^<\//.test(line);
    const isSelfClosing = /\/>$/.test(line);
    const isDeclaration = /^<\?/.test(line) || /^<!/.test(line);

    if (isClosing) {
      indent = Math.max(0, indent - 1);
    }

    lines.push(`${"  ".repeat(indent)}${line}`);

    if (!isClosing && !isSelfClosing && !isDeclaration && /^<[^!?][^>]*>$/.test(line)) {
      indent += 1;
    }
  }

  return `${lines.join("\n")}\n`;
}

export function MonacoCodeViewer(props: MonacoCodeViewerProps) {
  const { code, filename, language } = props;
  const { addToast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const [monacoAvailable, setMonacoAvailable] = useState(prefersMonaco);
  const [wrapEnabled, setWrapEnabled] = useState(false);
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  const useMonaco = prefersMonaco();

  useEffect(() => {
    if (!useMonaco || !containerRef.current) {
      return;
    }

    let disposed = false;
    const container = containerRef.current;

    void (async () => {
      try {
        const packageName = ["monaco", "editor"].join("-");
        const mod = await dynamicImportModule(packageName) as MonacoModule;
        if (!mod.editor || disposed) {
          return;
        }

        const editor = mod.editor.create(container, {
          value: code,
          language: "xml",
          readOnly: true,
          minimap: { enabled: minimapEnabled },
          wordWrap: wrapEnabled ? "on" : "off",
          lineNumbers: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 13,
          folding: true,
        });

        editorRef.current = editor;
      } catch (error) {
        console.warn("[XFEB] Monaco could not be loaded, falling back to classic viewer.", error);
        setMonacoAvailable(false);
      }
    })();

    return () => {
      disposed = true;
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, [useMonaco]);

  useEffect(() => {
    if (!useMonaco || !editorRef.current) {
      return;
    }
    editorRef.current.setValue(code);
  }, [code, useMonaco]);

  useEffect(() => {
    editorRef.current?.updateOptions?.({
      wordWrap: wrapEnabled ? "on" : "off",
      minimap: { enabled: minimapEnabled },
    });
  }, [minimapEnabled, wrapEnabled]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      addToast("Copied to clipboard");
    } catch {
      addToast("Failed to copy", "error");
    }
  }, [addToast, code]);

  const download = useCallback(() => {
    const ext = language === "xslt" ? ".xslt" : ".xml";
    const name = filename.endsWith(ext) ? filename : `${filename}${ext}`;
    const blob = new Blob([code], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${name}`);
  }, [addToast, code, filename, language]);

  const findInEditor = useCallback(async () => {
    const action = editorRef.current?.getAction?.("actions.find");
    if (!action) {
      addToast("Find is unavailable", "error");
      return;
    }
    await action.run();
  }, [addToast]);

  const formatInEditor = useCallback(async () => {
    const action = editorRef.current?.getAction?.("editor.action.formatDocument");
    if (action) {
      await action.run();
      return;
    }

    const formatted = formatXmlText(code);
    editorRef.current?.setValue(formatted);
    addToast("Formatted view");
  }, [addToast, code]);

  const jumpToTop = useCallback(() => {
    editorRef.current?.trigger?.("toolbar", "cursorTop", undefined);
  }, []);

  if (!useMonaco || !monacoAvailable) {
    return <CodeViewer code={code} filename={filename} language={language} />;
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["toolbar"]}>
        <span className={styles["filename"]}>{filename}</span>
        <Button size="sm" variant="ghost" onClick={() => { void findInEditor(); }}>
          Find
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { void formatInEditor(); }}>
          Format
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setWrapEnabled((value) => !value)}>
          {wrapEnabled ? "No Wrap" : "Wrap"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMinimapEnabled((value) => !value)}>
          {minimapEnabled ? "No Map" : "Minimap"}
        </Button>
        <Button size="sm" variant="ghost" onClick={jumpToTop}>
          Top
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { void copyToClipboard(); }}>
          Copy
        </Button>
        <Button size="sm" variant="ghost" onClick={download}>
          Download
        </Button>
      </div>
      <div className={styles["codeWrap"]} role="region" aria-label={`${language.toUpperCase()} code`}>
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
