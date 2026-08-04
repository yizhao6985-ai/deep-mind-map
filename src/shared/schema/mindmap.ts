import { z } from 'zod'

export const MapStyleSchema = z.enum(['classic', 'compact', 'card'])

export const MindNodeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().nullable(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string().nullable(),
  collapsed: z.boolean(),
  order: z.number()
})

export const MindMapSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  mapStyle: MapStyleSchema,
  folderId: z.string().nullable(),
  nodes: z.array(MindNodeSchema)
})

export const MindMapFileSchema = z.object({
  schemaVersion: z.literal(1),
  app: z.literal('deep-mind-map'),
  updatedAt: z.string(),
  exportedAt: z.string().optional(),
  map: MindMapSchema
})

export function parseMindMapFile(data: unknown) {
  return MindMapFileSchema.safeParse(data)
}
