import { useEffect, useRef } from 'react'

export function useScrollAnimation(threshold = 0.15) {
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      },
      { threshold }
    )

    const elements = ref.current?.querySelectorAll('.fade-up')
    elements?.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [threshold])

  return ref
}
