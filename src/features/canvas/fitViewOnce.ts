import { getViewportForBounds } from '@xyflow/system'

/** Options that keep a single-node map readable (not blown up to fill the pane). */
export const FIT_VIEW_OPTIONS = { padding: 0.35, maxZoom: 1, minZoom: 0.2 } as const

/**
 * Horizontal focus for default fit — left third leaves room for the floating AI panel
 * so a newly opened map does not look shoved into the chat.
 */
export const FIT_VIEW_FOCUS_X = 1 / 3

/**
 * React Flow's resize handler uses `width: size.width || 500` when the DOM
 * briefly reports 0 — fitting against that placeholder leaves the map off-center.
 */
export function isReactFlowSizeFallback(width: number, height: number): boolean {
  return width === 500 && height === 500
}

export type FitViewGateInput = {
  mapId: string
  fittedFor: string | null
  nodesReady: boolean
  viewportReady: boolean
  width: number
  height: number
}

export type BoundsRect = { x: number; y: number; width: number; height: number }
export type ViewportXY = { x: number; y: number; zoom: number }

/**
 * Decide whether FitViewOnce should schedule a fit.
 * Requires measured nodes, an initialized pan/zoom viewport, and a real pane size
 * (React Flow falls back to 500×500 when the DOM reports 0 — that must not commit).
 */
export function shouldScheduleFitView(input: FitViewGateInput): boolean {
  if (!input.nodesReady || !input.viewportReady) return false
  if (input.width <= 0 || input.height <= 0) return false
  if (input.fittedFor === input.mapId) return false
  return true
}

/** Screen-space center of a world-space bounds under a viewport transform. */
export function boundsCenterOnScreen(
  bounds: BoundsRect,
  viewport: ViewportXY
): { x: number; y: number } {
  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  return {
    x: viewport.x + cx * viewport.zoom,
    y: viewport.y + cy * viewport.zoom
  }
}

/**
 * Like getViewportForBounds, but places the bounds center at `focusX` of the pane width
 * when there is horizontal slack (small maps / maxZoom clamp). Wide maps that already
 * fill the padded width stay centered so nothing clips.
 */
export function getViewportForBoundsAtFocus(
  bounds: BoundsRect,
  width: number,
  height: number,
  minZoom: number,
  maxZoom: number,
  padding: number,
  focusX: number = FIT_VIEW_FOCUS_X
): ViewportXY {
  const centered = getViewportForBounds(bounds, width, height, minZoom, maxZoom, padding)
  const onScreen = boundsCenterOnScreen(bounds, centered)
  const halfW = (bounds.width * centered.zoom) / 2
  // Same padding formula React Flow uses for a numeric padding value.
  const padX = Math.floor((width - width / (1 + padding)) * 0.5)
  const minCenterX = padX + halfW
  const maxCenterX = width - padX - halfW
  const targetX =
    maxCenterX <= minCenterX
      ? onScreen.x
      : Math.min(maxCenterX, Math.max(minCenterX, width * focusX))
  return {
    ...centered,
    x: centered.x + (targetX - onScreen.x)
  }
}
