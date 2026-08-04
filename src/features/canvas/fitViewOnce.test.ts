import { describe, expect, it } from 'vitest'
import { getViewportForBounds } from '@xyflow/system'
import {
  FIT_VIEW_FOCUS_X,
  FIT_VIEW_OPTIONS,
  boundsCenterOnScreen,
  getViewportForBoundsAtFocus,
  isReactFlowSizeFallback,
  shouldScheduleFitView
} from './fitViewOnce'

const NODE = { x: 0, y: 0, width: 120, height: 44 }

describe('isReactFlowSizeFallback', () => {
  it('detects the 500×500 placeholder pane size', () => {
    expect(isReactFlowSizeFallback(500, 500)).toBe(true)
    expect(isReactFlowSizeFallback(1000, 700)).toBe(false)
    expect(isReactFlowSizeFallback(500, 700)).toBe(false)
  })
})

describe('shouldScheduleFitView', () => {
  const base = {
    mapId: 'map-a',
    fittedFor: null as string | null,
    nodesReady: true,
    viewportReady: true,
    width: 900,
    height: 640
  }

  it('schedules when nodes, viewport, and size are ready', () => {
    expect(shouldScheduleFitView(base)).toBe(true)
  })

  it('blocks until the viewport (panZoom) is ready', () => {
    expect(shouldScheduleFitView({ ...base, viewportReady: false })).toBe(false)
  })

  it('blocks on zero pane size', () => {
    expect(shouldScheduleFitView({ ...base, width: 0 })).toBe(false)
    expect(shouldScheduleFitView({ ...base, height: 0 })).toBe(false)
  })

  it('does not re-fit the same map', () => {
    expect(shouldScheduleFitView({ ...base, fittedFor: 'map-a' })).toBe(false)
  })

  it('allows fit after map id changes', () => {
    expect(shouldScheduleFitView({ ...base, mapId: 'map-b', fittedFor: 'map-a' })).toBe(true)
  })

  it('still schedules while dimensions are changing before commit', () => {
    // Debounce clears on width/height change; fittedFor stays null until timeout fires.
    expect(
      shouldScheduleFitView({
        ...base,
        fittedFor: null,
        width: 500,
        height: 500
      })
    ).toBe(true)
    expect(
      shouldScheduleFitView({
        ...base,
        fittedFor: null,
        width: 1000,
        height: 700
      })
    ).toBe(true)
  })
})

describe('getViewportForBoundsAtFocus', () => {
  it('places a small map at the left third of the pane', () => {
    const realW = 1000
    const realH = 700
    const vp = getViewportForBoundsAtFocus(
      NODE,
      realW,
      realH,
      FIT_VIEW_OPTIONS.minZoom,
      FIT_VIEW_OPTIONS.maxZoom,
      FIT_VIEW_OPTIONS.padding
    )
    const onScreen = boundsCenterOnScreen(NODE, vp)
    expect(onScreen.x).toBeCloseTo(realW * FIT_VIEW_FOCUS_X, 0)
    expect(onScreen.y).toBeCloseTo(realH / 2, 0)
  })

  it('keeps a width-filling map centered so edges do not clip', () => {
    const realW = 1000
    const realH = 700
    const wide = { x: 0, y: 0, width: 2200, height: 80 }
    const vp = getViewportForBoundsAtFocus(
      wide,
      realW,
      realH,
      FIT_VIEW_OPTIONS.minZoom,
      FIT_VIEW_OPTIONS.maxZoom,
      FIT_VIEW_OPTIONS.padding
    )
    const onScreen = boundsCenterOnScreen(wide, vp)
    expect(onScreen.x).toBeCloseTo(realW / 2, 0)
  })
})

describe('fitView wrong-size regression', () => {
  /**
   * React Flow's resize handler does `width: size.width || 500` when the DOM
   * briefly reports 0. Fitting against 500×500 then displaying in the real
   * pane leaves a new root node off the intended focus — the symptom for 新建思维导图.
   */
  it('fitting against the 500 fallback leaves the node off the intended focus', () => {
    const realW = 1000
    const realH = 700
    const fallback = getViewportForBoundsAtFocus(
      NODE,
      500,
      500,
      FIT_VIEW_OPTIONS.minZoom,
      FIT_VIEW_OPTIONS.maxZoom,
      FIT_VIEW_OPTIONS.padding
    )
    const correct = getViewportForBoundsAtFocus(
      NODE,
      realW,
      realH,
      FIT_VIEW_OPTIONS.minZoom,
      FIT_VIEW_OPTIONS.maxZoom,
      FIT_VIEW_OPTIONS.padding
    )

    const withFallback = boundsCenterOnScreen(NODE, fallback)
    const withCorrect = boundsCenterOnScreen(NODE, correct)

    // Correct fit puts the node at the left-third focus
    expect(withCorrect.x).toBeCloseTo(realW * FIT_VIEW_FOCUS_X, 0)
    expect(withCorrect.y).toBeCloseTo(realH / 2, 0)

    // Fallback fit is clearly away from the real intended focus (the bug)
    const dx = Math.abs(withFallback.x - realW * FIT_VIEW_FOCUS_X)
    const dy = Math.abs(withFallback.y - realH / 2)
    expect(dx + dy).toBeGreaterThan(150)
  })

  it('centered getViewportForBounds still differs from left-third focus', () => {
    const realW = 1000
    const realH = 700
    const centered = getViewportForBounds(
      NODE,
      realW,
      realH,
      FIT_VIEW_OPTIONS.minZoom,
      FIT_VIEW_OPTIONS.maxZoom,
      FIT_VIEW_OPTIONS.padding
    )
    const focused = getViewportForBoundsAtFocus(
      NODE,
      realW,
      realH,
      FIT_VIEW_OPTIONS.minZoom,
      FIT_VIEW_OPTIONS.maxZoom,
      FIT_VIEW_OPTIONS.padding
    )
    expect(boundsCenterOnScreen(NODE, centered).x).toBeCloseTo(realW / 2, 0)
    expect(boundsCenterOnScreen(NODE, focused).x).toBeCloseTo(realW * FIT_VIEW_FOCUS_X, 0)
  })
})
