import { useMemo } from "react";
import { computeDiff, diffStats, type DiffRow, type Segment } from "./diffEngine";

type Props = { oldText: string; newText: string };

const GUTTER: Record<DiffRow["type"], string> = {
  add: "+",
  remove: "-",
  context: " ",
};

function SegmentRun({ segment, type }: { segment: Segment; type: DiffRow["type"] }) {
  if (!segment.emphasis) return <>{segment.value}</>;
  return (
    <mark className={`seg seg--${type}`} data-testid="diff-emphasis">
      {segment.value}
    </mark>
  );
}

function Row({ row }: { row: DiffRow }) {
  return (
    <div className={`diff-row diff-row--${row.type}`} data-row-type={row.type} role="row">
      <span className="diff-num diff-num--old" role="cell">
        {row.oldLine ?? ""}
      </span>
      <span className="diff-num diff-num--new" role="cell">
        {row.newLine ?? ""}
      </span>
      <span className="diff-sign" aria-hidden="true">
        {GUTTER[row.type]}
      </span>
      <code className="diff-code" role="cell">
        {row.segments.length === 0 ? (
          " "
        ) : (
          row.segments.map((segment, idx) => (
            <SegmentRun key={idx} segment={segment} type={row.type} />
          ))
        )}
      </code>
    </div>
  );
}

export function DiffView({ oldText, newText }: Props) {
  const rows = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);
  const { additions, removals } = useMemo(() => diffStats(rows), [rows]);

  return (
    <div className="diff" aria-label="Version diff">
      <div className="diff__summary">
        <span className="diff__stat diff__stat--add">+{additions} additions</span>
        <span className="diff__stat diff__stat--remove">−{removals} removals</span>
        <span className="diff__hint">changed characters highlighted inline</span>
      </div>
      <div className="diff__body" role="table" aria-label="Line-by-line diff">
        {rows.map((row, idx) => (
          <Row key={idx} row={row} />
        ))}
      </div>
    </div>
  );
}
