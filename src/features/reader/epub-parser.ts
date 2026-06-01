import { Asset } from "expo-asset";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { getLocalFileInfo, readFileAsBase64 } from "@/utils/file-storage";

type ManifestItem = {
  id: string;
  href: string;
  mediaType: string;
  path: string;
  properties: string;
};

export type EpubChapter = {
  id: string;
  href: string;
  path: string;
  title: string;
};

export type EpubRenderedChapter = {
  chapter: EpubChapter;
  html: string;
};

export type EpubDocument = {
  title?: string;
  author?: string;
  chapters: EpubChapter[];
  loadChapter: (chapterIndex: number) => Promise<EpubRenderedChapter>;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

const epubCache = new Map<string, Promise<EpubDocument>>();
let readerFontFaceCssPromise: Promise<string> | null = null;

const readerFontAssets = [
  {
    family: "LumiraNotoSerifMyanmar",
    weight: 400,
    module: require("../../../assets/fonts/NotoSerifMyanmar-Regular.ttf"),
  },
  {
    family: "LumiraNotoSerifMyanmar",
    weight: 700,
    module: require("../../../assets/fonts/NotoSerifMyanmar-Bold.ttf"),
  },
  {
    family: "LumiraPadauk",
    weight: 400,
    module: require("../../../assets/fonts/Padauk-Regular.ttf"),
  },
  {
    family: "LumiraPadauk",
    weight: 700,
    module: require("../../../assets/fonts/Padauk-Bold.ttf"),
  },
] as const;

function cssUrl(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function loadReaderFontFaceCss() {
  if (!readerFontFaceCssPromise) {
    readerFontFaceCssPromise = Promise.all(
      readerFontAssets.map(async (font) => {
        const asset = Asset.fromModule(font.module);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;

        if (!uri) {
          return "";
        }

        return `
          @font-face {
            font-family: "${font.family}";
            src: url("${cssUrl(uri)}") format("truetype");
            font-weight: ${font.weight};
            font-style: normal;
            font-display: swap;
          }
        `;
      }),
    ).then((rules) => rules.filter(Boolean).join("\n"));
  }

  return readerFontFaceCssPromise;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim() || undefined;
  }

  if (Array.isArray(value)) {
    return textValue(value[0]);
  }

  if (value && typeof value === "object" && "#text" in value) {
    return textValue((value as { "#text": unknown })["#text"]);
  }

  return undefined;
}

function getDirectory(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index >= 0 ? filePath.slice(0, index + 1) : "";
}

function normalizeZipPath(path: string) {
  const parts: string[] = [];

  path.split("/").forEach((part) => {
    if (!part || part === ".") {
      return;
    }

    if (part === "..") {
      parts.pop();
      return;
    }

    parts.push(part);
  });

  return parts.join("/");
}

function cleanHref(href: string) {
  const withoutFragment = href.split("#")[0]?.split("?")[0] ?? "";

  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

function resolveZipPath(basePath: string, relativePath: string) {
  const cleanRelativePath = cleanHref(relativePath);

  if (!cleanRelativePath) {
    return cleanRelativePath;
  }

  if (cleanRelativePath.startsWith("/")) {
    return normalizeZipPath(cleanRelativePath.slice(1));
  }

  return normalizeZipPath(`${getDirectory(basePath)}${cleanRelativePath}`);
}

function mimeFromPath(path: string) {
  const extension = path.toLowerCase().split(".").pop();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "gif") {
    return "image/gif";
  }

  if (extension === "svg") {
    return "image/svg+xml";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "css") {
    return "text/css";
  }

  return "application/octet-stream";
}

function sanitizeMarkup(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

function extractBody(html: string) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1] ?? html;
}

function extractEmbeddedStyles(html: string) {
  return Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .filter(Boolean)
    .join("\n");
}

async function inlineStyles({
  html,
  chapterPath,
  zip,
}: {
  html: string;
  chapterPath: string;
  zip: JSZip;
}) {
  const cssBlocks: string[] = [];
  let htmlWithoutLinks = html;
  const linkTags = Array.from(html.matchAll(/<link\b[^>]*>/gi)).map((match) => match[0]);

  for (const linkTag of linkTags) {
    if (!/stylesheet/i.test(linkTag)) {
      continue;
    }

    const href = linkTag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];

    if (!href) {
      continue;
    }

    const cssPath = resolveZipPath(chapterPath, href);
    const cssEntry = zip.file(cssPath);

    if (cssEntry) {
      try {
        cssBlocks.push(await cssEntry.async("string"));
      } catch {
        // Broken CSS should never block chapter text rendering.
      }
    }

    htmlWithoutLinks = htmlWithoutLinks.replace(linkTag, "");
  }

  return {
    html: htmlWithoutLinks,
    css: cssBlocks.join("\n"),
  };
}

async function inlineImages({
  html,
  chapterPath,
  manifestByPath,
  zip,
}: {
  html: string;
  chapterPath: string;
  manifestByPath: Map<string, ManifestItem>;
  zip: JSZip;
}) {
  let resolvedHtml = html;
  const attributeMatches = Array.from(
    html.matchAll(/\b(src|href|xlink:href)\s*=\s*(["'])(.*?)\2/gi),
  );
  const replacements = new Map<string, string>();

  for (const match of attributeMatches) {
    const fullMatch = match[0];
    const attribute = match[1];
    const quote = match[2];
    const href = match[3];

    if (!href || href.startsWith("data:") || href.startsWith("#")) {
      continue;
    }

    const resourcePath = resolveZipPath(chapterPath, href);
    const resourceEntry = zip.file(resourcePath);

    if (!resourceEntry) {
      continue;
    }

    const mediaType = manifestByPath.get(resourcePath)?.mediaType ?? mimeFromPath(resourcePath);

    if (!mediaType.startsWith("image/")) {
      continue;
    }

    try {
      const base64 = await resourceEntry.async("base64");
      replacements.set(fullMatch, `${attribute}=${quote}data:${mediaType};base64,${base64}${quote}`);
    } catch {
      // Leave the original reference in place if the image cannot be decoded.
    }
  }

  replacements.forEach((replacement, original) => {
    resolvedHtml = resolvedHtml.split(original).join(replacement);
  });

  return resolvedHtml;
}

function createReaderHtml({
  bodyHtml,
  embeddedCss,
  fontFaceCss,
  linkedCss,
  title,
}: {
  bodyHtml: string;
  embeddedCss: string;
  fontFaceCss: string;
  linkedCss: string;
  title: string;
}) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      ${fontFaceCss}
      ${embeddedCss}
      ${linkedCss}
      :root {
        color-scheme: dark;
        --reader-bg: #17151C;
        --reader-text: #F6F2EA;
        --reader-heading: #FFFFFF;
        --reader-link: #C4A7FF;
        --reader-font-size: 19px;
        --reader-font-family: Georgia, "Times New Roman", serif;
        --reader-line-height: 1.72;
        --reader-padding-x: 24px;
        --reader-padding-y: 28px;
        --reader-content-width: 720px;
        background: var(--reader-bg);
        color: var(--reader-text);
      }
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: var(--reader-bg) !important;
        color: var(--reader-text) !important;
        font-family: var(--reader-font-family) !important;
        font-size: var(--reader-font-size) !important;
        line-height: var(--reader-line-height) !important;
        overflow-wrap: anywhere;
        -webkit-text-size-adjust: 100%;
        -webkit-touch-callout: none;
        -webkit-user-select: text;
        user-select: text;
      }
      body {
        padding: var(--reader-padding-y) var(--reader-padding-x) calc(var(--reader-padding-y) + 16px);
      }
      main {
        width: 100%;
        max-width: var(--reader-content-width);
        margin: 0 auto;
      }
      body * {
        background-color: transparent !important;
        max-width: 100%;
      }
      p, div, span, li, blockquote, section, article, aside, dd, dt, figcaption,
      td, th, pre, code, em, strong, small {
        color: var(--reader-text) !important;
        font-size: inherit !important;
        line-height: var(--reader-line-height) !important;
      }
      h1, h2, h3, h4, h5, h6 {
        color: var(--reader-heading) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        line-height: calc(var(--reader-line-height) * 0.78) !important;
        margin: 1.4em 0 0.55em;
      }
      p {
        margin: 0 0 1.05em;
      }
      a {
        color: var(--reader-link) !important;
      }
      img, svg {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1.25em auto;
      }
      table {
        max-width: 100%;
        border-collapse: collapse;
      }
      pre {
        white-space: pre-wrap;
      }
      * {
        box-sizing: border-box;
        -webkit-touch-callout: none;
      }
      main, main * {
        -webkit-user-select: text;
        user-select: text;
      }
      [data-lumira-annotation] {
        display: inline !important;
        margin: 0 !important;
        border: 0 !important;
        padding: 0 !important;
        color: inherit !important;
        font: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-style: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        letter-spacing: inherit !important;
        text-decoration: inherit !important;
        text-shadow: inherit !important;
        vertical-align: baseline !important;
        background-color: transparent !important;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }
      ::selection {
        background: rgba(139, 92, 246, 0.28);
      }
      @media (min-width: 768px) {
        body {
          padding: calc(var(--reader-padding-y) + 16px) calc(var(--reader-padding-x) + 32px) calc(var(--reader-padding-y) + 36px);
        }
      }
    </style>
    <script>
      window.__setReaderSettings = function(settings) {
        var root = document.documentElement;
        if (!settings) return;
        if (settings.colorScheme) {
          root.style.colorScheme = settings.colorScheme;
        }
        root.style.setProperty('--reader-bg', settings.backgroundColor);
        root.style.setProperty('--reader-text', settings.textColor);
        root.style.setProperty('--reader-heading', settings.headingColor);
        root.style.setProperty('--reader-link', settings.linkColor);
        root.style.setProperty('--reader-font-size', settings.fontSize + 'px');
        if (settings.fontFamily) {
          root.style.setProperty('--reader-font-family', settings.fontFamily);
        }
        root.style.setProperty('--reader-line-height', String(settings.lineHeight));
        root.style.setProperty('--reader-padding-x', settings.paddingX + 'px');
        root.style.setProperty('--reader-padding-y', settings.paddingY + 'px');
        root.style.setProperty('--reader-content-width', settings.contentWidth + 'px');
      };
      function textNodesUnder(root, includeAnnotations) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: function(node) {
            if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
            if (!includeAnnotations && node.parentElement && node.parentElement.closest('[data-lumira-annotation]')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        return nodes;
      }
      function rangeFromOffsets(start, end) {
        var nodes = textNodesUnder(document.querySelector('main') || document.body, true);
        var cursor = 0;
        var range = document.createRange();
        var foundStart = false;
        for (var i = 0; i < nodes.length; i += 1) {
          var node = nodes[i];
          var length = node.nodeValue.length;
          var next = cursor + length;
          if (!foundStart && start >= cursor && start <= next) {
            range.setStart(node, Math.max(0, start - cursor));
            foundStart = true;
          }
          if (foundStart && end >= cursor && end <= next) {
            range.setEnd(node, Math.max(0, end - cursor));
            return range;
          }
          cursor = next;
        }
        return null;
      }
      function selectedOffsets(range) {
        var nodes = textNodesUnder(document.querySelector('main') || document.body, true);
        var cursor = 0;
        var start = null;
        var end = null;
        for (var i = 0; i < nodes.length; i += 1) {
          var node = nodes[i];
          var length = node.nodeValue.length;
          if (node === range.startContainer) start = cursor + range.startOffset;
          if (node === range.endContainer) end = cursor + range.endOffset;
          cursor += length;
        }
        if (start === null || end === null) return null;
        return { startOffset: Math.min(start, end), endOffset: Math.max(start, end) };
      }
      function postSelection(showMenu) {
        var selection = window.getSelection && window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          if (!window.__lumiraSelectionLocked) hideLumiraSelectionMenu();
          return;
        }
        var text = String(selection.toString() || '').trim();
        if (!text) {
          if (!window.__lumiraSelectionLocked) hideLumiraSelectionMenu();
          return;
        }
        var range = selection.getRangeAt(0);
        var offsets = selectedOffsets(range);
        if (!offsets) {
          if (!window.__lumiraSelectionLocked) hideLumiraSelectionMenu();
          return;
        }
        var rect = range.getBoundingClientRect();
        var payload = {
          type: 'selection',
          selectedText: text,
          startOffset: offsets.startOffset,
          endOffset: offsets.endOffset,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        };
        window.__lumiraSelectionPayload = payload;
        if (showMenu !== false) {
          scheduleLumiraSelectionMenu(rect);
        }
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
      function ensureLumiraSelectionMenu() {
        var existing = document.getElementById('lumira-selection-menu');
        if (existing) return existing;
        var menu = document.createElement('div');
        menu.id = 'lumira-selection-menu';
        menu.style.position = 'fixed';
        menu.style.zIndex = '2147483647';
        menu.style.display = 'none';
        menu.style.alignItems = 'center';
        menu.style.gap = '6px';
        menu.style.maxWidth = 'calc(100vw - 28px)';
        menu.style.overflowX = 'auto';
        menu.style.padding = '6px';
        menu.style.borderRadius = '999px';
        menu.style.border = '1px solid rgba(255,255,255,0.22)';
        menu.style.setProperty('background-color', '#0F0B17', 'important');
        menu.style.boxShadow = '0 14px 34px rgba(0,0,0,0.38)';
        menu.style.webkitBackdropFilter = 'blur(18px)';
        menu.style.backdropFilter = 'blur(18px)';
        ['Highlight', 'Add Note', 'Copy'].forEach(function(label) {
          var button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          button.dataset.action = label === 'Add Note' ? 'note' : label.toLowerCase();
          button.style.minHeight = '34px';
          button.style.border = '0';
          button.style.borderRadius = '999px';
          button.style.padding = '0 12px';
          button.style.font = '600 13px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
          button.style.webkitUserSelect = 'none';
          button.style.userSelect = 'none';
          button.style.color = label === 'Highlight' ? '#111111' : '#FFFFFF';
          button.style.setProperty('background-color', label === 'Highlight'
            ? '#FACC15'
            : '#2A2140', 'important');
          button.addEventListener('touchstart', function(event) { event.stopPropagation(); }, { passive: true });
          button.addEventListener('mousedown', function(event) { event.preventDefault(); event.stopPropagation(); });
          button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            runLumiraSelectionAction(button.dataset.action);
          });
          menu.appendChild(button);
        });
        document.body.appendChild(menu);
        return menu;
      }
      function scheduleLumiraSelectionMenu(rect) {
        clearTimeout(window.__lumiraShowMenuTimer);
        hideLumiraSelectionMenu();
        window.__lumiraShowMenuTimer = setTimeout(function() {
          if (!window.__lumiraSelectionPayload || !window.__lumiraSelectionPayload.selectedText) return;
          showLumiraSelectionMenu(rect);
        }, 420);
      }
      function showLumiraSelectionMenu(rect) {
        var menu = ensureLumiraSelectionMenu();
        menu.style.display = 'flex';
        menu.style.visibility = 'hidden';
        var width = Math.min(menu.scrollWidth || 320, window.innerWidth - 24);
        var height = menu.offsetHeight || 46;
        var edgePadding = 12;
        var topSafe = 82;
        var bottomSafe = 22;
        var clearance = 22;
        var left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
        var belowTop = rect.bottom + clearance;
        var aboveTop = rect.top - height - 86;
        var bottomDockTop = window.innerHeight - height - bottomSafe;
        var top;

        if (belowTop + height <= window.innerHeight - bottomSafe) {
          top = belowTop;
        } else if (aboveTop >= topSafe) {
          top = aboveTop;
        } else {
          top = Math.max(topSafe, bottomDockTop);
        }

        top = Math.max(topSafe, Math.min(window.innerHeight - height - bottomSafe, top));
        menu.style.left = left + 'px';
        menu.style.top = Math.max(edgePadding, top) + 'px';
        menu.style.visibility = 'visible';
      }
      function hideLumiraSelectionMenu() {
        clearTimeout(window.__lumiraShowMenuTimer);
        var menu = document.getElementById('lumira-selection-menu');
        if (menu) menu.style.display = 'none';
      }
      function copyLumiraSelectionText(text) {
        var value = String(text || '');
        if (!value) return;

        function fallbackCopy() {
          var textarea = document.createElement('textarea');
          textarea.value = value;
          textarea.setAttribute('readonly', 'readonly');
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.top = '0';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          try {
            document.execCommand('copy');
          } catch {
            // WebView clipboard support varies by platform.
          }
          document.body.removeChild(textarea);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).catch(fallbackCopy);
          return;
        }

        fallbackCopy();
      }
      function runLumiraSelectionAction(action) {
        var payload = window.__lumiraSelectionPayload;
        if (!payload || !payload.selectedText) return;
        hideLumiraSelectionMenu();
        if (action === 'copy') {
          copyLumiraSelectionText(payload.selectedText);
        }
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'selectionAction',
          action: action,
          selectedText: payload.selectedText,
          startOffset: payload.startOffset,
          endOffset: payload.endOffset,
          rect: payload.rect
        }));
        if (action !== 'note') {
          window.__clearLumiraSelection();
        }
      }
      document.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }, true);
      document.addEventListener('scroll', hideLumiraSelectionMenu, true);
      document.addEventListener('touchstart', function(event) {
        var menu = document.getElementById('lumira-selection-menu');
        if (menu && !menu.contains(event.target)) hideLumiraSelectionMenu();
      }, { passive: true });
      document.addEventListener('selectionchange', function() {
        clearTimeout(window.__lumiraSelectionTimer);
        window.__lumiraSelectionTimer = setTimeout(postSelection, 180);
      });
      window.__clearLumiraSelection = function() {
        window.__lumiraSelectionLocked = false;
        window.__lumiraSelectionPayload = null;
        var selection = window.getSelection && window.getSelection();
        if (selection) selection.removeAllRanges();
        hideLumiraSelectionMenu();
      };
      window.__applyLumiraAnnotations = function(annotations) {
        document.querySelectorAll('[data-lumira-annotation]').forEach(function(mark) {
          mark.replaceWith(document.createTextNode(mark.textContent || ''));
        });
        document.body.normalize();
        function plainTextSnapshot() {
          var root = document.querySelector('main') || document.body;
          var nodes = textNodesUnder(root, true);
          var text = '';
          nodes.forEach(function(node) {
            text += node.nodeValue || '';
          });
          return { nodes: nodes, text: text };
        }
        function findClosestNeedle(fullText, needle, preferredStart) {
          if (!needle) return -1;
          var bestIndex = -1;
          var bestDistance = Number.MAX_SAFE_INTEGER;
          var index = fullText.indexOf(needle);
          while (index !== -1) {
            var distance = Math.abs(index - preferredStart);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestIndex = index;
            }
            index = fullText.indexOf(needle, index + Math.max(needle.length, 1));
          }
          return bestIndex;
        }
        function normalizeWithMap(value) {
          var normalized = '';
          var map = [];
          var previousWasSpace = false;

          for (var i = 0; i < value.length; i += 1) {
            var character = value.charAt(i);
            var isSpace = /\s|\u00a0/.test(character);

            if (isSpace) {
              if (previousWasSpace) continue;
              normalized += ' ';
              map.push(i);
              previousWasSpace = true;
            } else {
              normalized += character;
              map.push(i);
              previousWasSpace = false;
            }
          }

          return { text: normalized.trim(), map: map };
        }
        function findClosestNormalizedNeedle(fullText, needle, preferredStart) {
          var full = normalizeWithMap(fullText);
          var target = normalizeWithMap(String(needle || '')).text;
          if (!target) return null;

          var normalizedPreferred = 0;
          for (var i = 0; i < full.map.length; i += 1) {
            if (full.map[i] <= preferredStart) normalizedPreferred = i;
            else break;
          }

          var bestIndex = -1;
          var bestDistance = Number.MAX_SAFE_INTEGER;
          var index = full.text.indexOf(target);
          while (index !== -1) {
            var distance = Math.abs(index - normalizedPreferred);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestIndex = index;
            }
            index = full.text.indexOf(target, index + Math.max(target.length, 1));
          }

          if (bestIndex === -1) return null;

          var originalStart = full.map[bestIndex] ?? preferredStart;
          var originalEnd = (full.map[bestIndex + target.length - 1] ?? originalStart) + 1;
          return { start: originalStart, end: Math.max(originalStart + 1, originalEnd) };
        }
        function resolveAnnotationRange(annotation, fullText) {
          var start = Math.max(0, Number(annotation.startOffset || 0));
          var end = Math.max(start, Number(annotation.endOffset || 0));
          var selectedText = String(annotation.text || '').trim();

          if (!selectedText) return { start: start, end: end };

          var currentText = fullText.slice(start, end).trim();
          if (currentText === selectedText) {
            var leadingWhitespace = fullText.slice(start, end).search(/\S/);
            if (leadingWhitespace > 0) start += leadingWhitespace;
            return { start: start, end: start + selectedText.length };
          }

          var closest = findClosestNeedle(fullText, selectedText, start);
          if (closest !== -1) {
            return { start: closest, end: closest + selectedText.length };
          }

          var normalizedRange = findClosestNormalizedNeedle(fullText, selectedText, start);
          if (normalizedRange) {
            return normalizedRange;
          }

          return { start: start, end: end };
        }
        function wrapTextNode(node, start, end, annotation) {
          var text = node.nodeValue || '';
          if (start >= end || start >= text.length) return;
          if (node.parentElement && node.parentElement.closest('[data-lumira-annotation]')) return;
          var before = text.slice(0, start);
          var middle = text.slice(start, Math.min(end, text.length));
          var after = text.slice(Math.min(end, text.length));
          var fragment = document.createDocumentFragment();
          if (before) fragment.appendChild(document.createTextNode(before));
          if (middle) {
            var mark = document.createElement('span');
            mark.dataset.lumiraAnnotation = annotation.id || 'annotation';
            mark.dataset.lumiraAnnotationType = annotation.type || 'highlight';
            mark.style.font = 'inherit';
            mark.style.color = 'inherit';
            mark.style.lineHeight = 'inherit';
            mark.style.textShadow = 'inherit';
            mark.style.borderRadius = '0.16em';
            mark.style.webkitBoxDecorationBreak = 'clone';
            mark.style.boxDecorationBreak = 'clone';
            mark.style.setProperty('background-color', 'rgba(250, 204, 21, 0.28)', 'important');
            mark.style.backgroundImage = 'none';
            mark.appendChild(document.createTextNode(middle));
            fragment.appendChild(mark);
          }
          if (after) fragment.appendChild(document.createTextNode(after));
          node.parentNode && node.parentNode.replaceChild(fragment, node);
        }
        (annotations || []).slice().sort(function(a, b) {
          return Number(b.startOffset || 0) - Number(a.startOffset || 0);
        }).forEach(function(annotation) {
          var snapshot = plainTextSnapshot();
          var resolvedRange = resolveAnnotationRange(annotation, snapshot.text);
          var start = resolvedRange.start;
          var end = resolvedRange.end;
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
          var nodes = snapshot.nodes;
          var cursor = 0;
          nodes.forEach(function(node) {
            var length = (node.nodeValue || '').length;
            var nodeStart = cursor;
            var nodeEnd = cursor + length;
            if (end > nodeStart && start < nodeEnd) {
              wrapTextNode(node, Math.max(0, start - nodeStart), Math.min(length, end - nodeStart), annotation);
            }
            cursor = nodeEnd;
          });
        });
      };
      window.__scrollToLumiraOffset = function(offset) {
        var range = rangeFromOffsets(Number(offset || 0), Number(offset || 0) + 1);
        if (!range) return;
        var rect = range.getBoundingClientRect();
        window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 96), behavior: 'smooth' });
      };
    </script>
  </head>
  <body>
    <main>${bodyHtml}</main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildNavTitleMap({
  navXml,
  navPath,
}: {
  navXml?: string;
  navPath: string;
}) {
  const titles = new Map<string, string>();

  if (!navXml) {
    return titles;
  }

  Array.from(navXml.matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi))
    .forEach((match) => {
      const href = match[2];
      const label = sanitizeMarkup(match[3]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      if (href && label) {
        titles.set(resolveZipPath(navPath, href), label);
      }
    });

  return titles;
}

async function buildNcxTitleMap({
  ncxPath,
  zip,
}: {
  ncxPath?: string;
  zip: JSZip;
}) {
  const titles = new Map<string, string>();

  if (!ncxPath) {
    return titles;
  }

  const safeNcxPath = ncxPath;
  const ncxXml = await zip.file(safeNcxPath)?.async("string");

  if (!ncxXml) {
    return titles;
  }

  const ncx = parser.parse(ncxXml);

  function visitNavPoint(navPoint: unknown) {
    if (!navPoint || typeof navPoint !== "object") {
      return;
    }

    const node = navPoint as Record<string, unknown>;
    const label = textValue((node.navLabel as Record<string, unknown> | undefined)?.text);
    const src = String((node.content as Record<string, unknown> | undefined)?.["@_src"] ?? "");

    if (label && src) {
      titles.set(resolveZipPath(safeNcxPath, src), label);
    }

    asArray(node.navPoint).forEach(visitNavPoint);
  }

  asArray(ncx?.ncx?.navMap?.navPoint).forEach(visitNavPoint);
  return titles;
}

async function parseEpubDocument(fileUri: string): Promise<EpubDocument> {
  const fileInfo = await getLocalFileInfo(fileUri);

  if (!fileInfo.exists) {
    throw new Error("The copied EPUB file is missing from local storage.");
  }

  await new Promise((resolve) => setTimeout(resolve, 0));
  const base64 = await readFileAsBase64(fileUri);
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const containerXml = await zip.file("META-INF/container.xml")?.async("string");

  if (!containerXml) {
    throw new Error("This EPUB is missing META-INF/container.xml.");
  }

  const container = parser.parse(containerXml);
  const rootFile = asArray(container?.container?.rootfiles?.rootfile)[0] as
    | Record<string, unknown>
    | undefined;
  const opfPath = String(rootFile?.["@_full-path"] ?? "");
  const opfXml = opfPath ? await zip.file(opfPath)?.async("string") : undefined;

  if (!opfXml) {
    throw new Error("This EPUB package file could not be opened.");
  }

  const opf = parser.parse(opfXml);
  const packageNode = opf?.package ?? {};
  const metadata = (packageNode.metadata ?? {}) as Record<string, unknown>;
  const manifestItems = asArray(packageNode.manifest?.item)
    .map((item) => item as Record<string, unknown>)
    .map<ManifestItem>((item) => {
      const href = String(item["@_href"] ?? "");
      return {
        id: String(item["@_id"] ?? ""),
        href,
        mediaType: String(item["@_media-type"] ?? ""),
        path: resolveZipPath(opfPath, href),
        properties: String(item["@_properties"] ?? ""),
      };
    })
    .filter((item) => item.id && item.href);
  const manifestById = new Map(manifestItems.map((item) => [item.id, item]));
  const manifestByPath = new Map(manifestItems.map((item) => [item.path, item]));
  const spine = asArray(packageNode.spine?.itemref).map(
    (item) => item as Record<string, unknown>,
  );
  const navItem = manifestItems.find((item) =>
    item.properties.split(/\s+/).includes("nav"),
  );
  const ncxId = String((packageNode.spine as Record<string, unknown> | undefined)?.["@_toc"] ?? "");
  const ncxPath = ncxId ? manifestById.get(ncxId)?.path : undefined;
  const navXml = navItem ? await zip.file(navItem.path)?.async("string") : undefined;
  const navTitles = buildNavTitleMap({ navXml, navPath: navItem?.path ?? opfPath });
  const ncxTitles = await buildNcxTitleMap({ ncxPath, zip });
  const chapters = spine
    .map((itemref) => manifestById.get(String(itemref["@_idref"] ?? "")))
    .filter((item): item is ManifestItem => {
      if (!item) {
        return false;
      }

      return (
        item.mediaType.includes("html") ||
        item.path.endsWith(".html") ||
        item.path.endsWith(".xhtml") ||
        item.path.endsWith(".htm")
      );
    })
    .map<EpubChapter>((item, index) => ({
      id: item.id || item.path,
      href: item.href,
      path: item.path,
      title:
        navTitles.get(item.path) ??
        ncxTitles.get(item.path) ??
        `Chapter ${index + 1}`,
    }));

  if (chapters.length === 0) {
    throw new Error("No readable chapters were found in this EPUB.");
  }

  return {
    title: textValue(metadata.title),
    author: textValue(metadata.creator),
    chapters,
    loadChapter: async (chapterIndex: number) => {
      const fontFaceCssPromise = loadReaderFontFaceCss();
      const chapter = chapters[chapterIndex];

      if (!chapter) {
        throw new Error("That chapter is not available.");
      }

      const chapterXml = await zip.file(chapter.path)?.async("string");

      if (!chapterXml) {
        throw new Error("This chapter could not be loaded.");
      }

      const sanitized = sanitizeMarkup(chapterXml);
      const { html, css } = await inlineStyles({
        html: sanitized,
        chapterPath: chapter.path,
        zip,
      });
      const bodyHtml = await inlineImages({
        html: sanitizeMarkup(extractBody(html)),
        chapterPath: chapter.path,
        manifestByPath,
        zip,
      });

      return {
        chapter,
        html: createReaderHtml({
          bodyHtml,
          embeddedCss: extractEmbeddedStyles(html),
          fontFaceCss: await fontFaceCssPromise,
          linkedCss: css,
          title: chapter.title,
        }),
      };
    },
  };
}

export function loadEpubDocument(fileUri: string) {
  const cachedDocument = epubCache.get(fileUri);

  if (cachedDocument) {
    return cachedDocument;
  }

  const documentPromise = parseEpubDocument(fileUri).catch((error) => {
    epubCache.delete(fileUri);
    throw error;
  });

  epubCache.set(fileUri, documentPromise);
  return documentPromise;
}
