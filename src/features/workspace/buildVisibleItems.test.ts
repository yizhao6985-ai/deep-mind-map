import { describe, expect, it } from 'vitest'
import { buildVisibleItems } from './buildVisibleItems'
import type { LibraryMapMeta } from '@shared/types/domain'

const map = (partial: Partial<LibraryMapMeta> & Pick<LibraryMapMeta, 'id' | 'title'>): LibraryMapMeta => ({
  folderId: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  relativePath: `${partial.id}.json`,
  ...partial
})

describe('buildVisibleItems', () => {
  it('sorts root maps by title without throwing', () => {
    expect(() =>
      buildVisibleItems(
        [],
        [map({ id: 'b', title: '斑马' }), map({ id: 'a', title: '阿尔法' })],
        new Set()
      )
    ).not.toThrow()

    const items = buildVisibleItems(
      [],
      [map({ id: 'b', title: '斑马' }), map({ id: 'a', title: '阿尔法' })],
      new Set()
    )
    expect(items.map((i) => (i.kind === 'map' ? i.map.title : ''))).toEqual(['阿尔法', '斑马'])
  })

  it('shows maps whose folderId is missing from the local folder index', () => {
    const items = buildVisibleItems(
      [],
      [map({ id: 'orphan', title: '远程拉取', folderId: 'missing-folder' })],
      new Set()
    )
    expect(items).toEqual([
      expect.objectContaining({
        kind: 'map',
        map: expect.objectContaining({ id: 'orphan', title: '远程拉取' })
      })
    ])
  })
})
