import React from "react";

type WdyrInitializer = (react: typeof React, options?: Record<string, unknown>) => void;

function isWdyrInitializer(value: unknown): value is WdyrInitializer {
  return typeof value === "function";
}

export async function enableWhyDidYouRender(): Promise<void> {
  const packageName = "@welldone-software/why-did-you-render";

  try {
    const mod = await import(/* @vite-ignore */ packageName) as {
      readonly default?: unknown;
      readonly whyDidYouRender?: unknown;
    };

    const init = mod.default ?? mod.whyDidYouRender;
    if (!isWdyrInitializer(init)) {
      console.warn("[XFEB] why-did-you-render loaded, but no initializer was found.");
      return;
    }

    init(React, {
      collapseGroups: true,
      include: [/^LeftPanel$/, /^RightTabs$/],
      trackAllPureComponents: false,
    });
  } catch (error) {
    console.warn(
      `[XFEB] why-did-you-render could not be loaded. Install "${packageName}" to enable it.`,
      error,
    );
  }
}
