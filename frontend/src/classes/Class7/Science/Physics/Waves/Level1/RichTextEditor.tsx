import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import "./RichTextEditor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  minHeight?: string;
}

interface FormatButton {
  icon: string;
  label: string;
  command: string;
  type: "format" | "block" | "list";
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Type '/' for commands...",
  autoFocus = false,
  minHeight = "120px",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");

  // Format buttons like Notion
  const formatButtons: FormatButton[] = [
    { icon: "𝐁", label: "Bold", command: "bold", type: "format" },
    { icon: "𝐼", label: "Italic", command: "italic", type: "format" },
    { icon: "U̲", label: "Underline", command: "underline", type: "format" },
    { icon: "S̶", label: "Strike", command: "strikethrough", type: "format" },
    { icon: "💻", label: "Code", command: "code", type: "format" },
    { icon: "🔗", label: "Link", command: "link", type: "format" },
  ];

  const blockButtons: FormatButton[] = [
    { icon: "H1", label: "Heading 1", command: "h1", type: "block" },
    { icon: "H2", label: "Heading 2", command: "h2", type: "block" },
    { icon: "H3", label: "Heading 3", command: "h3", type: "block" },
    { icon: "¶", label: "Paragraph", command: "p", type: "block" },
    { icon: "💬", label: "Quote", command: "quote", type: "block" },
    { icon: "💻", label: "Code Block", command: "codeblock", type: "block" },
    { icon: "—", label: "Divider", command: "divider", type: "block" },
  ];

  const listButtons: FormatButton[] = [
    { icon: "•", label: "Bullet List", command: "ul", type: "list" },
    { icon: "1.", label: "Numbered List", command: "ol", type: "list" },
    { icon: "☐", label: "Checkbox", command: "checkbox", type: "list" },
  ];

  // Slash commands like Notion
  const slashCommands = [
    {
      icon: "📝",
      label: "Text",
      command: "text",
      description: "Just start writing with plain text.",
    },
    {
      icon: "📋",
      label: "To-do list",
      command: "todo",
      description: "Track tasks with a to-do list.",
    },
    {
      icon: "H1",
      label: "Heading 1",
      command: "h1",
      description: "Big section heading.",
    },
    {
      icon: "H2",
      label: "Heading 2",
      command: "h2",
      description: "Medium section heading.",
    },
    {
      icon: "H3",
      label: "Heading 3",
      command: "h3",
      description: "Small section heading.",
    },
    {
      icon: "•",
      label: "Bulleted list",
      command: "ul",
      description: "Create a simple bulleted list.",
    },
    {
      icon: "1.",
      label: "Numbered list",
      command: "ol",
      description: "Create a list with numbering.",
    },
    {
      icon: "💬",
      label: "Quote",
      command: "quote",
      description: "Capture a quote.",
    },
    {
      icon: "💻",
      label: "Code",
      command: "code",
      description: "Capture a code snippet.",
    },
    {
      icon: "—",
      label: "Divider",
      command: "divider",
      description: "Visually divide blocks.",
    },
    {
      icon: "📊",
      label: "Table",
      command: "table",
      description: "Add a simple table.",
    },
  ];

  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  // Handle text selection for toolbar
  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setSelectedText(selection.toString());
      setShowToolbar(true);
    } else {
      setSelectedText("");
      setShowToolbar(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Slash command trigger
    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSlashMenuPosition({
            x: rect.left,
            y: rect.bottom + window.scrollY,
          });
          setShowSlashMenu(true);
        }
      }, 0);
    }

    // Hide slash menu on other keys
    if (e.key !== "/" && showSlashMenu) {
      setShowSlashMenu(false);
    }

    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
          e.preventDefault();
          execCommand("bold");
          break;
        case "i":
          e.preventDefault();
          execCommand("italic");
          break;
        case "u":
          e.preventDefault();
          execCommand("underline");
          break;
        case "`":
          e.preventDefault();
          toggleInlineCode();
          break;
      }
    }

    // Block shortcuts
    if (e.key === "Enter") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const parentElement =
          container.nodeType === Node.TEXT_NODE
            ? container.parentElement
            : (container as Element);

        // Handle list continuation
        if (parentElement?.tagName === "LI") {
          const listItem = parentElement as HTMLLIElement;
          if (listItem.textContent?.trim() === "") {
            e.preventDefault();
            exitList();
          }
        }
      }
    }
  };

  // Execute formatting commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateContent();
  };

  // Toggle inline code
  const toggleInlineCode = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const selectedText = selection.toString();
      const codeElement = document.createElement("code");
      codeElement.textContent = selectedText;
      codeElement.className = "inline-code";

      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(codeElement);

      updateContent();
    }
  };

  // Exit list when pressing enter on empty list item
  const exitList = () => {
    execCommand("outdent");
    execCommand("formatBlock", "p");
  };

  // Handle slash command selection
  const handleSlashCommand = (command: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      // Remove the slash
      range.setStart(range.startContainer, range.startOffset - 1);
      range.deleteContents();

      switch (command) {
        case "h1":
        case "h2":
        case "h3":
          execCommand("formatBlock", command);
          break;
        case "quote":
          execCommand("formatBlock", "blockquote");
          break;
        case "ul":
          execCommand("insertUnorderedList");
          break;
        case "ol":
          execCommand("insertOrderedList");
          break;
        case "code":
          insertCodeBlock();
          break;
        case "divider":
          insertDivider();
          break;
        case "todo":
          insertTodoList();
          break;
        case "table":
          insertTable();
          break;
      }
    }
    setShowSlashMenu(false);
  };

  // Insert code block
  const insertCodeBlock = () => {
    const codeBlock = document.createElement("pre");
    const code = document.createElement("code");
    code.className = "code-block";
    code.contentEditable = "true";
    code.textContent = "// Write your code here";
    codeBlock.appendChild(code);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(codeBlock);
    }
    updateContent();
  };

  // Insert divider
  const insertDivider = () => {
    const divider = document.createElement("hr");
    divider.className = "divider";

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(divider);
    }
    updateContent();
  };

  // Insert todo list
  const insertTodoList = () => {
    const todoItem = document.createElement("div");
    todoItem.className = "todo-item";
    todoItem.innerHTML = `
      <input type="checkbox" class="todo-checkbox" />
      <span class="todo-text" contenteditable="true">Todo item</span>
    `;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(todoItem);
    }
    updateContent();
  };

  // Insert table
  const insertTable = () => {
    const table = document.createElement("table");
    table.className = "notion-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th contenteditable="true">Header 1</th>
          <th contenteditable="true">Header 2</th>
          <th contenteditable="true">Header 3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td contenteditable="true">Cell 1</td>
          <td contenteditable="true">Cell 2</td>
          <td contenteditable="true">Cell 3</td>
        </tr>
        <tr>
          <td contenteditable="true">Cell 4</td>
          <td contenteditable="true">Cell 5</td>
          <td contenteditable="true">Cell 6</td>
        </tr>
      </tbody>
    `;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(table);
    }
    updateContent();
  };

  // Update content
  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Handle input
  const handleInput = () => {
    updateContent();
  };

  return (
    <div className="rich-text-editor">
      {/* Floating Toolbar */}
      {showToolbar && selectedText && (
        <motion.div
          className="floating-toolbar"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {formatButtons.map((button) => (
            <button
              key={button.command}
              onClick={() => execCommand(button.command)}
              className="toolbar-btn"
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </motion.div>
      )}

      {/* Slash Menu */}
      {showSlashMenu && (
        <motion.div
          className="slash-menu"
          style={{
            position: "absolute",
            left: slashMenuPosition.x,
            top: slashMenuPosition.y,
          }}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
        >
          <div className="slash-menu-header">
            <span className="slash-icon">✨</span>
            <span>Add a block</span>
          </div>
          {slashCommands.map((command) => (
            <button
              key={command.command}
              onClick={() => handleSlashCommand(command.command)}
              className="slash-menu-item"
            >
              <span className="slash-command-icon">{command.icon}</span>
              <div className="slash-command-content">
                <div className="slash-command-label">{command.label}</div>
                <div className="slash-command-description">
                  {command.description}
                </div>
              </div>
            </button>
          ))}
        </motion.div>
      )}

      {/* Main Editor */}
      <div
        ref={editorRef}
        className="rich-text-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        style={{ minHeight }}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value }}
      />

      {/* Format Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <span className="toolbar-label">Format:</span>
          {formatButtons.map((button) => (
            <button
              key={button.command}
              onClick={() => execCommand(button.command)}
              className="toolbar-btn"
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </div>

        <div className="toolbar-section">
          <span className="toolbar-label">Blocks:</span>
          {blockButtons.slice(0, 4).map((button) => (
            <button
              key={button.command}
              onClick={() =>
                button.command === "p"
                  ? execCommand("formatBlock", "p")
                  : button.command.startsWith("h")
                  ? execCommand("formatBlock", button.command)
                  : button.command === "quote"
                  ? execCommand("formatBlock", "blockquote")
                  : button.command === "codeblock"
                  ? insertCodeBlock()
                  : button.command === "divider"
                  ? insertDivider()
                  : null
              }
              className="toolbar-btn"
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </div>

        <div className="toolbar-section">
          <span className="toolbar-label">Lists:</span>
          {listButtons.map((button) => (
            <button
              key={button.command}
              onClick={() =>
                button.command === "ul"
                  ? execCommand("insertUnorderedList")
                  : button.command === "ol"
                  ? execCommand("insertOrderedList")
                  : button.command === "checkbox"
                  ? insertTodoList()
                  : null
              }
              className="toolbar-btn"
              title={button.label}
            >
              {button.icon}
            </button>
          ))}
        </div>

        <div className="toolbar-shortcuts">
          <span className="shortcut-hint">💡 Type '/' for commands</span>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
