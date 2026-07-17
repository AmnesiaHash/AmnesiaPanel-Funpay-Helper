import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '../store/app.store'

export { useLicenseInit } from './useLicenseInit'

/**
 * Initializes auth state from main process on app load.
 */
export function useAuthInit(): { ready: boolean } {
  const { setAccount, setConnected } = useAppStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!window.amnesia) {
      console.error('Preload API unavailable: window.amnesia is missing')
      setReady(true)
      return
    }

    window.amnesia.getAuthStatus().then((result) => {
      if (result.success && result.data?.connected && result.data.account) {
        setAccount(result.data.account)
        setConnected(true)
      }
      setReady(true)
    }).catch((error) => {
      console.error('Auth init failed:', error)
      setReady(true)
    })
  }, [setAccount, setConnected])

  return { ready }
}

/**
 * Subscribes to job progress events from main process.
 */
export function useJobProgress(): void {
  const setJobProgress = useAppStore((s) => s.setJobProgress)

  useEffect(() => {
    const unsubscribe = window.amnesia.onJobProgress((progress) => {
      setJobProgress(progress)
      if (progress.done >= progress.total) {
        setTimeout(() => setJobProgress(null), 1500)
      }
    })
    return unsubscribe
  }, [setJobProgress])
}

/**
 * Debounced value hook for search inputs.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

/**
 * Loads lots from FunPay API.
 */
export function useFetchLots() {
  const { setLots, setLoading, setError, setAccount } = useAppStore()

  const fetchLots = useCallback(async () => {
    setLoading(true)
    setError(null)
    const lotsResult = await window.amnesia.fetchLots()
    const authResult = await window.amnesia.getAuthStatus()
    if (authResult.success && authResult.data?.account) {
      setAccount(authResult.data.account)
    }
    if (lotsResult.success && lotsResult.data) {
      setLots(lotsResult.data)
    } else {
      setError(lotsResult.error ?? 'Ошибка загрузки лотов')
    }
    setLoading(false)
  }, [setLots, setLoading, setError, setAccount])

  return { fetchLots }
}
