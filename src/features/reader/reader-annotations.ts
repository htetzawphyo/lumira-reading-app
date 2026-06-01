import type { Highlight, Note, ReaderAnchor } from "@/features/books/types";

export type ReaderSelection = ReaderAnchor & {
  rect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

export type ChapterAnnotation = {
  id: string;
  type: "highlight" | "note";
  text: string;
  startOffset: number;
  endOffset: number;
  color: "yellow";
};

export function annotationsForChapter({
  highlights,
  notes,
  chapterIndex,
}: {
  highlights: Highlight[];
  notes: Note[];
  chapterIndex: number;
}): ChapterAnnotation[] {
  const highlightAnnotations = highlights
    .filter(
      (highlight) =>
        highlight.chapterIndex === chapterIndex &&
        typeof highlight.startOffset === "number" &&
        typeof highlight.endOffset === "number"
    )
    .map<ChapterAnnotation>((highlight) => ({
      id: highlight.id,
      type: "highlight",
      text: highlight.text,
      startOffset: highlight.startOffset ?? 0,
      endOffset: highlight.endOffset ?? 0,
      color: "yellow",
    }));

  const noteAnnotations = notes
    .filter(
      (note) =>
        note.chapterIndex === chapterIndex &&
        typeof note.startOffset === "number" &&
        typeof note.endOffset === "number"
    )
    .map<ChapterAnnotation>((note) => ({
      id: note.id,
      type: "note",
      text: note.selectedText || note.content,
      startOffset: note.startOffset ?? 0,
      endOffset: note.endOffset ?? 0,
      color: "yellow",
    }));

  return [...highlightAnnotations, ...noteAnnotations].sort(
    (first, second) => first.startOffset - second.startOffset
  );
}

export function buildApplyAnnotationsScript(annotations: ChapterAnnotation[]) {
  const payload = JSON.stringify(annotations).replace(/</g, "\\u003c");

  return `
    if (window.__applyLumiraAnnotations) {
      window.__applyLumiraAnnotations(${payload});
    }
    true;
  `;
}

export function buildScrollToOffsetScript(offset?: number | null) {
  const safeOffset = Math.max(0, Math.floor(offset ?? 0));

  return `
    if (window.__scrollToLumiraOffset) {
      window.__scrollToLumiraOffset(${safeOffset});
    }
    true;
  `;
}
