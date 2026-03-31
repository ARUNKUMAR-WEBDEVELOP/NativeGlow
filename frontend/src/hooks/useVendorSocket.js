import { useEffect, useRef, useState, useCallback } from 'react'

export function useVendorSocket(vendorId) {
  const ws            = useRef(null)
  const [notifications, setNotifications] = useState([])
  const [connected, setConnected]         = useState(false)

  useEffect(() => {
    if (!vendorId) return

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    ws.current = new WebSocket(`${WS_URL}/ws/vendor/${vendorId}/`)

    ws.current.onopen = () => {
      setConnected(true)
      console.log('Vendor socket connected')
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_order') {
        setNotifications(prev => [data, ...prev])
        // Play notification sound
        const audio = new Audio('/notification.mp3')
        audio.play().catch(() => {})
      }
    }

    ws.current.onclose = () => {
      setConnected(false)
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        ws.current = new WebSocket(`${WS_URL}/ws/vendor/${vendorId}/`)
      }, 5000)
    }

    return () => ws.current?.close()
  }, [vendorId])

  const clearNotification = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index))
  }, [])

  return { notifications, connected, clearNotification }
}
