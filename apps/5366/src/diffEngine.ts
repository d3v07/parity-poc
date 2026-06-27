import { diffLines, diffChars } from "diff";

/**
 * A contiguous run of text inside one rendered line. `emphasis` marks the exact
 * characters that changed (GitHub's darker inline shade); plain segments are the
 * unchanged remainder of an otherwise-modified line.
 */
export type Segment = { value: string; emphasis: boolean };

/**
 * One rendered line of the diff.
 *  - "context": present unchanged in both versions — no background.
 *  - "add": present only in the new version — green background.
 *  - "remove": present only in the old version — red background.
 * Only "add"/"remove" rows carry intra-line emphasis segments.
 */
export type RowType = "context" | "add" | "remove";

export type DiffRow = {
  type: RowType;
  /** Line number in the old version, or null for pure additions. */
  oldLine: number | null;
  /** Line number in the new version, or null for pure removals. */
  newLine: number | null;
  segments: Segment[];
};

/** Split a diff hunk's `value` into individual lines, dropping a trailing "". */
function toLines(value: string): string[] {
  const lines = value.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** A whole line with no intra-line highlighting (pure add/remove or context). */
function plainSegments(line: string): Segment[] {
  return line.length === 0 ? [] : [{ value: line, emphasis: false }];
}

/**
 * Character-diff a removed line against the added line that replaced it and
 * project the result onto each side. On the removed (red) row, the characters
 * that were taken out are emphasized; on the added (green) row, the characters
 * that were introduced are emphasized. Shared characters stay plain.
 */
function intraLine(oldLine: string, newLine: string): { removed: Segment[]; added: Segment[] } {
  const parts = diffChars(oldLine, newLine);
  const removed: Segment[] = [];
  const added: Segment[] = [];

  for (const part of parts) {
    if (part.added) {
      added.push({ value: part.value, emphasis: true });
    } else if (part.removed) {
      removed.push({ value: part.value, emphasis: true });
    } else {
      removed.push({ value: part.value, emphasis: false });
      added.push({ value: part.value, emphasis: false });
    }
  }

  return { removed, added };
}

/**
 * Build a GitHub-style row model from two text versions.
 *
 * `diffLines` yields a flat list of hunks tagged added / removed / unchanged.
 * A removed hunk immediately followed by an added hunk is a *modification*: we
 * zip the two line-for-line and run an intra-line character diff on each pair so
 * only the changed characters are highlighted. Lone adds/removes and any
 * leftover lines from an uneven pairing get row color but no emphasis.
 */
export function computeDiff(oldText: string, newText: string): DiffRow[] {
  const hunks = diffLines(oldText, newText);
  const rows: DiffRow[] = [];
  let oldNo = 0;
  let newNo = 0;

  for (let i = 0; i < hunks.length; i++) {
    const hunk = hunks[i];
    const next = hunks[i + 1];

    if (!hunk.added && !hunk.removed) {
      for (const line of toLines(hunk.value)) {
        oldNo += 1;
        newNo += 1;
        rows.push({ type: "context", oldLine: oldNo, newLine: newNo, segments: plainSegments(line) });
      }
      continue;
    }

    // A removed hunk paired with the following added hunk = modified lines.
    if (hunk.removed && next?.added) {
      const removedLines = toLines(hunk.value);
      const addedLines = toLines(next.value);
      const paired = Math.min(removedLines.length, addedLines.length);

      for (let j = 0; j < paired; j++) {
        const { removed, added } = intraLine(removedLines[j], addedLines[j]);
        oldNo += 1;
        rows.push({ type: "remove", oldLine: oldNo, newLine: null, segments: removed });
        newNo += 1;
        rows.push({ type: "add", oldLine: null, newLine: newNo, segments: added });
      }
      for (let j = paired; j < removedLines.length; j++) {
        oldNo += 1;
        rows.push({ type: "remove", oldLine: oldNo, newLine: null, segments: plainSegments(removedLines[j]) });
      }
      for (let j = paired; j < addedLines.length; j++) {
        newNo += 1;
        rows.push({ type: "add", oldLine: null, newLine: newNo, segments: plainSegments(addedLines[j]) });
      }

      i += 1; // consumed the paired added hunk
      continue;
    }

    if (hunk.removed) {
      for (const line of toLines(hunk.value)) {
        oldNo += 1;
        rows.push({ type: "remove", oldLine: oldNo, newLine: null, segments: plainSegments(line) });
      }
      continue;
    }

    // hunk.added (lone)
    for (const line of toLines(hunk.value)) {
      newNo += 1;
      rows.push({ type: "add", oldLine: null, newLine: newNo, segments: plainSegments(line) });
    }
  }

  return rows;
}

/** Counts for the summary header. */
export function diffStats(rows: DiffRow[]): { additions: number; removals: number } {
  let additions = 0;
  let removals = 0;
  for (const row of rows) {
    if (row.type === "add") additions += 1;
    else if (row.type === "remove") removals += 1;
  }
  return { additions, removals };
}
