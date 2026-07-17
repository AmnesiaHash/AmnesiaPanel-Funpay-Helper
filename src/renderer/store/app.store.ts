import { create } from 'zustand'
import type {
  AccountInfo,
  JobProgress,
  License,
  LotSummary,
  ThemeMode
} from '../../shared/types'

interface AppState {
  connected: boolean
  account: AccountInfo | null
  lots: LotSummary[]
  selectedLotIds: Set<string>
  loading: boolean
  error: string | null
  theme: ThemeMode
  jobProgress: JobProgress | null
  licensed: boolean
  isDevelopmentMode: boolean
  license: License | null
  setConnected: (connected: boolean) => void
  setAccount: (account: AccountInfo | null) => void
  setLots: (lots: LotSummary[]) => void
  toggleLotSelection: (id: string) => void
  selectAllLots: (ids: string[]) => void
  clearSelection: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setTheme: (theme: ThemeMode) => void
  setJobProgress: (progress: JobProgress | null) => void
  setLicenseState: (state: {
    licensed: boolean
    isDevelopmentMode: boolean
    license: License | null
  }) => void
}

/**
 * Global application state store.
 */
export const useAppStore = create<AppState>((set, get) => ({
  connected: false,
  account: null,
  lots: [],
  selectedLotIds: new Set(),
  loading: false,
  error: null,
  theme: 'dark',
  jobProgress: null,
  licensed: false,
  isDevelopmentMode: false,
  license: null,
  setConnected: (connected) => set({ connected }),
  setAccount: (account) => set({ account, connected: !!account }),
  setLots: (lots) => set({ lots }),
  toggleLotSelection: (id) => {
    const next = new Set(get().selectedLotIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    set({ selectedLotIds: next })
  },
  selectAllLots: (ids) => set({ selectedLotIds: new Set(ids) }),
  clearSelection: () => set({ selectedLotIds: new Set() }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setTheme: (theme) => set({ theme }),
  setJobProgress: (jobProgress) => set({ jobProgress }),
  setLicenseState: ({ licensed, isDevelopmentMode, license }) =>
    set({ licensed, isDevelopmentMode, license })
}))

/**
 * Applies theme class to document body.
 */
export function applyTheme(theme: ThemeMode): void {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.body.classList.toggle('dark', isDark)
  document.body.classList.toggle('light', !isDark)
}
