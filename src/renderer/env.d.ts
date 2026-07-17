/// <reference types="vite/client" />

import type { AmnesiaApi } from '../shared/types'

declare global {
  interface Window {
    amnesia: AmnesiaApi
  }
}

export {}
