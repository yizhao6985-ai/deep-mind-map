/// <reference types="vite/client" />

import type { DmmApi } from '@shared/types/api'

declare global {
  interface Window {
    dmm: DmmApi
  }
}

export {}
