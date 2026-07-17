import { useEffect, useState } from 'react'
import { useAppStore } from '../store/app.store'

/**
 * Marks the free build as always licensed (no subscription gate).
 */
export function useLicenseInit(): { ready: boolean } {
  const setLicenseState = useAppStore((s) => s.setLicenseState)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!window.amnesia?.getLicenseInfo) {
      setLicenseState({ licensed: true, isDevelopmentMode: false, license: null })
      setReady(true)
      return
    }

    window.amnesia
      .getLicenseInfo()
      .then((result) => {
        if (result.success && result.data) {
          setLicenseState({
            licensed: true,
            isDevelopmentMode: false,
            license: result.data.license
          })
        } else {
          setLicenseState({ licensed: true, isDevelopmentMode: false, license: null })
        }
      })
      .catch((error) => {
        console.error('License init failed:', error)
        setLicenseState({ licensed: true, isDevelopmentMode: false, license: null })
      })
      .finally(() => setReady(true))
  }, [setLicenseState])

  return { ready }
}
