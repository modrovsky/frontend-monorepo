import { validate as validateUrl } from "./url.js";

export const iterate = (fn, nodes) => {
  for (let node of nodes) {
    fn(node);
    if (node.children == null) continue;
    iterate(fn, node.children);
  }
};

export const map = (fn, nodes) => {
  const mappedNodes = [];

  for (let [index, node] of nodes.entries()) {
    if (node.children != null) node.children = map(fn, node.children);
    mappedNodes.push(fn(node, index));
  }

  return mappedNodes;
};

export const filter = (predicate, nodes) => {
  const filteredNodes = [];

  for (let [index, node] of nodes.entries()) {
    if (node.children != null)
      node = { ...node, children: filter(predicate, node.children) };
    if (!predicate(node, index)) continue;
    filteredNodes.push(node);
  }

  return filteredNodes;
};

export const some = (predicate, nodes) => {
  for (let node of nodes) {
    if (predicate(node)) return true;
    if (node.children == null) continue;
    return some(predicate, node.children);
  }
  return false;
};

export const every = (predicate, nodes) => {
  for (let node of nodes) {
    if (!predicate(node)) return false;
    if (node.children == null) continue;
    return every(predicate, node.children);
  }
  return true;
};

const isNodeEmpty = (node, options = {}) => {
  const { trim = false } = options;

  if (node.text != null)
    return trim ? node.text.trim() === "" : node.text === "";

  switch (node.type) {
    case "emoji":
    case "user":
    case "channel-link":
    case "image":
    case "horizontal-divider":
      return false;

    case "code-block":
      return node.code.trim() === "";

    default:
      return node.children.every((n) => isNodeEmpty(n, options));
  }
};

export const isEmpty = (nodes, options) =>
  nodes.every((n) => isNodeEmpty(n, options));

const isNodeEqual = (n1, n2) => {
  if (n1.type !== n2.type) return false;

  // Text nodes
  if (n1.text != null)
    return ["text", "bold", "italic", "strikethrough"].every(
      (p) => n1[p] === n2[p]
    );

  // The rest is for element nodes

  const baseEqual = () => {
    const [cs1, cs2] = [n1, n2].map((n) =>
      n.children.filter((n) => !isNodeEmpty(n))
    );

    if (cs1.length !== cs2.length) return false;

    return cs1.every((node1, i) => {
      const node2 = cs2[i];
      return isNodeEqual(node1, node2);
    });
  };

  const propertiesEqual = (ps) => ps.every((p) => n1[p] === n2[p]);

  switch (n1.type) {
    case "link":
      return propertiesEqual(["url", "label"]) && baseEqual();

    case "user":
      return propertiesEqual(["ref"]);

    case "channel-link":
      return propertiesEqual(["ref"]);

    case "emoji":
      return propertiesEqual(["emoji"]);

    case "image":
    case "image-attachment":
      return propertiesEqual(["url", "caption"]);

    case "horizontal-divider":
      return n1.type === n2.type;

    default:
      return baseEqual();
  }
};

export const isEqual = (ns1, ns2) =>
  isNodeEqual({ type: "root", children: ns1 }, { type: "root", children: ns2 });

export const getMentions = (nodes) => {
  const mentions = [];

  iterate((node) => {
    if (node.type === "user") mentions.push(node);
  }, nodes);

  return mentions;
};

export const withoutAttachments = (nodes) =>
  filter((n) => n.type !== "attachments", nodes);

export const parseString = (string) => {
  if (string.trim() === "") return [];

  const paragraphStrings = string.split(/^\s*$/m).map((s) => s.trim());

  const paragraphElements = paragraphStrings.map((paragraphString) => {
    const paragraphChildren = paragraphString
      .split(/\n/)
      .reduce((paragraphElements, line, i, lines) => {
        const isLastLine = i === lines.length - 1;

        const lineElements = line.split(/\s+/).reduce((els, word) => {
          const prev = els[els.length - 1];

          const isValidUrl = validateUrl(word);

          if (isValidUrl) {
            const disalloedEndCharacters = [".", ",", ";", ")"];
            let cleanedUrl = word;
            let trailingPart = "";
            while (
              disalloedEndCharacters.includes(cleanedUrl[cleanedUrl.length - 1])
            ) {
              trailingPart = cleanedUrl[cleanedUrl.length - 1] + trailingPart;
              cleanedUrl = cleanedUrl.slice(0, -1);
            }

            if (prev != null) prev.text = `${prev.text} `;
            const url = new URL(cleanedUrl);
            const linkEl = { type: "link", url: url.href };
            if (trailingPart === "") return [...els, linkEl];
            return [...els, linkEl, { text: trailingPart }];
          }

          if (prev == null || prev.type === "link")
            return [...els, { text: prev == null ? word : ` ${word}` }];

          prev.text = `${prev.text} ${word}`;

          return els;
        }, []);

        if (isLastLine) return [...paragraphElements, ...lineElements];

        return [...paragraphElements, ...lineElements, { text: "\n" }];
      }, []);

    return createParagraphElement(paragraphChildren);
  });

  return paragraphElements;
};

export const stringifyBlocks = (
  blockElements,
  { humanReadable = true, renderUser, renderChannelLink } = {}
) => {
  const stringifyTextNode = (l) => {
    let text = l.text;

    if (humanReadable) return l.strikethrough ? `~${text}~` : text;

    if (l.bold) text = `*${text}*`;
    if (l.italic) text = `_${text}_`;
    if (l.strikethrough) text = `~${text}~`;
    return text;
  };

  const stringifyElement = (el) => {
    const stringifyChildren = () => el.children.map(stringifyNode).join("");

    switch (el.type) {
      case "paragraph":
      case "heading-1":
      case "heading-2":
      case "list-item":
        return `\n${stringifyChildren()}\n`;

      case "quote":
      case "callout":
        return `\n> ${stringifyChildren()}\n`;

      case "bulleted-list":
      case "numbered-list": {
        const children = el.children.map((el, i) => {
          const prefix = el.type === "bulleted-list" ? "-" : `${i + 1}.`;
          return `${prefix} ${stringifyNode(el)}`;
        });
        return `\n${children.join("\n")}\n`;
      }

      case "user": {
        if (!humanReadable) return `@<u:${el.ref}>`;
        return renderUser(el.ref);
      }

      case "channel-link": {
        if (!humanReadable) return `@<c:${el.ref}>`;
        return renderChannelLink(el.ref);
      }

      case "link":
        return el.url;

      case "emoji":
        return el.emoji;

      case "attachments":
      case "image-grid":
        return `\n${stringifyChildren()}\n`;

      case "image":
      case "image-attachment":
        return humanReadable ? el.url : "";

      case "horizontal-divider":
        return "\n---\n";

      case "code-block":
        return `\n\`\`\`${el.code}\`\`\`\n`;

      default:
        throw new Error(`Unsupported element type "${el.type}"`);
    }
  };

  const stringifyNode = (n) => {
    if (n.text != null) return stringifyTextNode(n);
    return stringifyElement(n);
  };

  return (
    blockElements
      .map(stringifyElement)
      .join("")
      // Gets rid of the the outer paragraph line breaks, I dunno
      .replace(/^[\n]|[\n]$/g, "")
  );
};

export const toMarkdown = (blockElements) => {
  const renderTextNode = (l) => {
    let text = l.text;

    if (l.bold) text = `**${text}**`;
    if (l.italic) text = `*${text}*`;
    if (l.strikethrough) text = `~~${text}~~`;
    return text;
  };

  const renderBlockElement = (el) => {
    const renderInlineChildren = () => el.children.map(renderNode).join("");

    switch (el.type) {
      case "paragraph":
        return renderInlineChildren();

      case "heading-1":
        return `# ${renderInlineChildren()}`;
      case "heading-2":
        return `## ${renderInlineChildren()}`;
      case "heading-3":
        return `### ${renderInlineChildren()}`;
      case "heading-4":
        return `#### ${renderInlineChildren()}`;

      case "quote":
      case "callout":
        // Block children
        if (el.children[0].children != null)
          return el.children
            .map(renderBlockElement)
            .join("\n\n")
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n");

        return `> ${renderInlineChildren().trim().split("\n").join("\n> ")}`;

      case "bulleted-list":
      case "numbered-list": {
        const isBulletList = el.type === "bulleted-list";

        const children = el.children.map((el, i) => {
          const listItemPrefix = isBulletList ? "-" : `${i + 1}.`;
          const renderedListItemChildBlocks =
            el.children.map(renderBlockElement);

          const indentSpace = "".padStart(listItemPrefix.length + 1, " ");

          // Special case to make simple nested lists look bit nicer
          const skipBlockSpace =
            el.children.length === 2 &&
            el.children[0].type === "paragraph" &&
            ["bulleted-list", "numbered-list"].includes(el.children[1].type);

          return `${listItemPrefix} ${renderedListItemChildBlocks
            .filter((s) => s.trim() !== "")
            .join(skipBlockSpace ? "\n" : "\n\n")}`
            .split("\n")
            .join(`\n${indentSpace}`);
        });

        return children.join("\n");
      }

      case "image-grid":
      case "attachments":
        return el.children.map(renderBlockElement).join("\n");

      case "image": {
        const altText = el.text ?? el.caption ?? el.url;
        if (el.caption == null || el.caption.trim() === "")
          return `![${altText}](${el.url})`;

        try {
          new URL(el.caption);
          return `[![${altText}](${el.url} "${el.caption}")](${el.caption})`;
        } catch (e) {
          return `![${altText}](${el.url} "${el.caption}")`;
        }
      }

      case "horizontal-divider":
        return "---";

      case "code-block":
        return `\`\`\`\n${el.code}\n\`\`\``;

      case "table": {
        const header = el.children.find((el) => el.type === "table-head");
        const body = el.children.find((el) => el.type === "table-body");

        const rows = [
          ...(header?.children ?? []),
          ...(body?.children ?? []),
        ].map((rowEl) =>
          rowEl.children.map((cellEl) =>
            cellEl.children.map(renderNode).join("")
          )
        );

        const columnWidths = rows.reduce((widths, cells) => {
          cells.forEach((cell, i) => {
            widths[i] = Math.max(widths[i] ?? 0, cell.length);
          });
          return widths;
        }, []);

        const renderRow = (cells) =>
          `| ${cells
            .map((text, i) => text.padEnd(columnWidths[i], " "))
            .join(" | ")} |`;

        const table = rows.map(renderRow).join("\n");

        if (header == null) return table;

        const renderedRows = table.split("\n");

        return [
          renderedRows[0],
          // Header bottom divider
          `| ${columnWidths
            .map((width) => "".padEnd(width, "-"))
            .join(" | ")} |`,
          ...renderedRows.slice(1),
        ].join("\n");
      }

      default:
        throw new Error(`Unknown element type: "${el.type}"`);
    }
  };

  const renderNode = (node) => {
    if (node.type == null || node.type === "text") return renderTextNode(node);

    switch (node.type) {
      case "link":
        return `[${node.label ?? node.text ?? node.url}](${node.url})`;

      case "emoji":
        return node.emoji;

      default:
        throw new Error(`Unknown node type: "${node.type}"`);
    }
  };

  return blockElements
    .map((el, i) => renderBlockElement(el, { index: i }))
    .filter((s) => s.trim() !== "")
    .join("\n\n");
};

export const createParagraphElement = (content = "") => ({
  type: "paragraph",
  children: typeof content === "string" ? [{ text: content }] : content,
});

export const createEmptyParagraphElement = () => createParagraphElement();
