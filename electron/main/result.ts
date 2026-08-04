import type { DmmErrorCode, DmmResult } from '@shared/types/domain'

export function ok<T>(data: T): DmmResult<T> {
  return { ok: true, data }
}

export function fail(code: DmmErrorCode, message: string): DmmResult<never> {
  return { ok: false, code, message }
}

export function fromUnknown(err: unknown, fallback = '发生未知错误'): DmmResult<never> {
  const message = err instanceof Error ? err.message : fallback
  return fail('UNKNOWN', message)
}
