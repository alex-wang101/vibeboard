import { memo, useState } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

interface ArchitectureEdgeData {
  importCount: number;
  dataFlowCount: number;
  typeOnlyCount: number;
  hasDynamic: boolean;
  samples: { from: string; to: string }[];
}

function ArchitectureEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<ArchitectureEdgeData>) {
  const [hovered, setHovered] = useState(false);

  const { importCount = 1, dataFlowCount = 0, typeOnlyCount = 0, hasDynamic = false, samples = [] } = data ?? {};

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // Visual style based on import classification
  const isTypeOnly = dataFlowCount === 0 && typeOnlyCount > 0;
  const strokeWidth = Math.min(1 + Math.log2(importCount), 5);
  const strokeColor = hasDynamic
    ? 'rgba(245, 158, 11, 0.5)'
    : hovered
      ? 'rgba(255, 255, 255, 0.4)'
      : 'rgba(255, 255, 255, 0.1)';
  const strokeDasharray = isTypeOnly ? '6 4' : undefined;

  return (
    <>
      {/* Invisible wider path for easier hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          transition: 'stroke 0.15s ease',
        }}
      />
      {hovered && (
        <foreignObject
          x={labelX - 100}
          y={labelY - 40}
          width={200}
          height={80}
          className="pointer-events-none"
        >
          <div className="bg-black/90 backdrop-blur border border-white/10 rounded-lg px-3 py-2 text-center">
            <div className="text-white/70 text-[11px] font-medium">
              {importCount} import{importCount !== 1 ? 's' : ''}
              {dataFlowCount > 0 && <span className="text-green-400 ml-1">({dataFlowCount} data)</span>}
              {typeOnlyCount > 0 && <span className="text-gray-400 ml-1">({typeOnlyCount} type)</span>}
            </div>
            {samples.length > 0 && (
              <div className="text-white/30 text-[9px] mt-1 font-mono truncate">
                {last(samples[0].from)} → {last(samples[0].to)}
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </>
  );
}

function last(path: string): string {
  return path.split('/').pop() ?? path;
}

export const ArchitectureEdge = memo(ArchitectureEdgeComponent);
