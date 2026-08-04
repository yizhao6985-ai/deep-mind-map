import { memo } from 'react'
import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'

export type MindBranchEdgeData = {
  selected?: boolean
}

type MindBranchEdgeType = Edge<MindBranchEdgeData, 'mindBranch'>

/** XMind-like right-map branch: horizontal stub → rounded elbow → horizontal into topic. */
function mindBranchPath(sx: number, sy: number, tx: number, ty: number): string {
  const dx = tx - sx
  const dy = ty - sy

  if (Math.abs(dy) < 1.5) {
    return `M ${sx} ${sy} L ${tx} ${ty}`
  }

  const midX = sx + Math.max(28, Math.min(dx * 0.45, dx - 28))
  const bend = Math.min(14, Math.abs(dy) / 2, Math.max(8, Math.abs(dx) * 0.18))
  const dir = dy > 0 ? 1 : -1

  return [
    `M ${sx} ${sy}`,
    `L ${midX - bend} ${sy}`,
    `Q ${midX} ${sy} ${midX} ${sy + dir * bend}`,
    `L ${midX} ${ty - dir * bend}`,
    `Q ${midX} ${ty} ${midX + bend} ${ty}`,
    `L ${tx} ${ty}`
  ].join(' ')
}

function MindBranchEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
  selected
}: EdgeProps<MindBranchEdgeType>) {
  const useBezier = Math.abs(targetY - sourceY) < 1.5 && targetX - sourceX < 40
  const path =
    useBezier || targetX <= sourceX
      ? getBezierPath({ sourceX, sourceY, targetX, targetY })[0]
      : mindBranchPath(sourceX, sourceY, targetX, targetY)

  const isHot = Boolean(selected || data?.selected)

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      className={`mind-branch-edge${isHot ? ' is-selected' : ''}`}
      style={{
        ...style,
        stroke: isHot ? 'var(--branch-hot)' : 'var(--branch)',
        strokeWidth: isHot ? 2 : 1.6,
        fill: 'none'
      }}
    />
  )
}

export default memo(MindBranchEdge)
