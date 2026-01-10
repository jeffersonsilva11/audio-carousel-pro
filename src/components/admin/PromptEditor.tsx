import { useCallback, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables?: string[];
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}

// Custom highlighting for {{variables}}
const variableHighlight = HighlightStyle.define([
  { tag: tags.processingInstruction, color: "#f59e0b", fontWeight: "bold" },
]);

// Custom theme extensions
const customTheme = EditorView.theme({
  "&": {
    fontSize: "14px",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
  },
  ".cm-content": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    padding: "12px",
  },
  ".cm-gutters": {
    backgroundColor: "hsl(var(--muted))",
    borderRight: "1px solid hsl(var(--border))",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "hsl(var(--accent))",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "hsl(var(--primary))",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "hsl(var(--accent) / 0.3)",
  },
  ".cm-placeholder": {
    color: "hsl(var(--muted-foreground))",
  },
});

// Regex to match {{variables}}
const variableRegex = /\{\{[^}]+\}\}/g;

// Function to highlight variables in the content
const highlightVariables = EditorView.decorations.compute(["doc"], (state) => {
  const decorations: { from: number; to: number }[] = [];
  const text = state.doc.toString();
  let match;

  while ((match = variableRegex.exec(text)) !== null) {
    decorations.push({
      from: match.index,
      to: match.index + match[0].length,
    });
  }

  // Reset regex state
  variableRegex.lastIndex = 0;

  return EditorView.decorations.of(
    decorations.map(({ from, to }) =>
      // @ts-expect-error - Decoration mark type issue
      EditorView.Decoration.mark({
        class: "cm-variable-highlight",
      }).range(from, to)
    )
  );
});

// Variable highlight style
const variableStyle = EditorView.baseTheme({
  ".cm-variable-highlight": {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    color: "#f59e0b",
    borderRadius: "3px",
    padding: "1px 2px",
    fontWeight: "600",
  },
});

const PromptEditor = ({
  value,
  onChange,
  variables = [],
  placeholder = "Enter prompt content...",
  minHeight = "200px",
  readOnly = false,
}: PromptEditorProps) => {
  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  const extensions = useMemo(
    () => [
      markdown(),
      customTheme,
      variableStyle,
      highlightVariables,
      syntaxHighlighting(variableHighlight),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": "Prompt editor" }),
    ],
    []
  );

  return (
    <div className="space-y-2">
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        theme={oneDark}
        placeholder={placeholder}
        readOnly={readOnly}
        minHeight={minHeight}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightSelectionMatches: true,
        }}
      />
      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground mr-1">
            Clique para inserir:
          </span>
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                // Insert variable at cursor position would require more complex integration
                // For now, append to end
                onChange(value + v);
              }}
              className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-mono hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptEditor;
