import { useEffect, useRef, useState } from 'react'

export function useFormPersist<T extends Record<string, any>>(
  storageKey: string,
  currentValues: T,
) {
  const [initialValues, setInitialValues] = useState<T | undefined>(undefined)
  const timeoutRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        setInitialValues(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to load form data from session storage', e)
    }
  }, [storageKey])

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(currentValues))
      } catch (e) {
        console.error('Failed to save form data to session storage', e)
      }
    }, 500)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [storageKey, currentValues])

  const clear = () => {
    sessionStorage.removeItem(storageKey)
    setInitialValues(undefined)
  }

  return { initialValues, clear }
}
