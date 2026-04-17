import { useEffect, useRef } from 'react'

export function useScrollRestore(storageKey: string) {
  const timeoutRef = useRef<NodeJS.Timeout>(null)

  useEffect(() => {
    const container = document.getElementById('main-content') || window

    const restoreScroll = () => {
      try {
        const stored = sessionStorage.getItem(`scroll-${storageKey}`)
        if (stored) {
          const scrollTop = parseInt(stored, 10)
          if (!isNaN(scrollTop)) {
            if (container === window) {
              window.scrollTo(0, scrollTop)
            } else {
              ;(container as HTMLElement).scrollTop = scrollTop
            }
          }
        }
      } catch (e) {
        console.error('Failed to restore scroll position', e)
      }
    }

    const timerId = setTimeout(restoreScroll, 100)

    const handleScroll = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        try {
          const scrollTop =
            container === window ? window.scrollY : (container as HTMLElement).scrollTop
          sessionStorage.setItem(`scroll-${storageKey}`, scrollTop.toString())
        } catch (e) {
          console.error('Failed to save scroll position', e)
        }
      }, 200)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          const scrollTop =
            container === window ? window.scrollY : (container as HTMLElement).scrollTop
          sessionStorage.setItem(`scroll-${storageKey}`, scrollTop.toString())
        } catch (e) {
          // Ignore
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(timerId)
      container.removeEventListener('scroll', handleScroll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [storageKey])
}
