"use client"

import { useEffect, useRef } from "react"
import Cal, { getCalApi } from "@calcom/embed-react"

interface BookingModalProps {
  isOpen: boolean
  eventSlug: string
  onClose: () => void
}

export default function BookingModal({ isOpen, eventSlug, onClose }: BookingModalProps) {
  const calApiRef = useRef<any>(null)
  const listenersAddedRef = useRef(false)

  // Initialize Cal on component mount
  useEffect(() => {
    const initializeCal = async () => {
      try {
        const cal = await getCalApi()
        calApiRef.current = cal

        // Configure Cal UI
        cal("ui", {
          theme: "dark",
          hideEventTypeDetails: false,
        })
      } catch (error) {
        console.error("Error initializing Cal.com:", error)
      }
    }

    initializeCal()
  }, [])

  // Handle modal opening and event listeners
  useEffect(() => {
    const handleCalEvents = async () => {
      if (!isOpen || !eventSlug) return

      try {
        const cal = calApiRef.current || await getCalApi()

        // Open the modal with the specific event
        cal("modal", {
          calLink: `portal-espiritual/${eventSlug}`,
        })

        // Add event listeners only once
        if (!listenersAddedRef.current) {
          // Listen for successful booking
          cal("on", {
            action: "bookingSuccessful",
            callback: () => {
              onClose()
            }
          })

          // Listen for modal close
          cal("on", {
            action: "__closeIframe",
            callback: () => {
              onClose()
            }
          })

          listenersAddedRef.current = true
        }
      } catch (error) {
        console.error("Error opening Cal.com modal:", error)
      }
    }

    handleCalEvents()

    // Cleanup function
    return () => {
      // Only remove listeners when component unmounts
      if (listenersAddedRef.current && calApiRef.current) {
        try {
          const cal = calApiRef.current

          // Remove event listeners
          cal("off", {
            action: "bookingSuccessful"
          })

          cal("off", {
            action: "__closeIframe"
          })
        } catch (error) {
          console.error("Error removing Cal.com event listeners:", error)
        }
      }
    }
  }, [isOpen, eventSlug, onClose])

  // Component renders nothing - it only controls the Cal popup imperatively
  return null
}