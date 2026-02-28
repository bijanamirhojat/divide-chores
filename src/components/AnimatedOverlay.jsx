import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Reusable overlay wrapper with enter/exit animations.
 * 
 * Props:
 * - show: boolean — whether the overlay should be visible
 * - onClose: () => void — called when backdrop is clicked
 * - direction: 'right' | 'up' | 'fade' — animation direction for the panel
 * - children: ReactNode — the overlay content panel
 * - className: string — additional classes for the content wrapper
 * - zIndex: number — z-index for stacking (default 50)
 */
export default function AnimatedOverlay({ show, onClose, direction = 'up', children, className = '', zIndex = 50 }) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    if (show) {
      setMounted(true)
      setClosing(false)
    } else if (mounted) {
      setClosing(true)
    }
  }, [show])

  const handleAnimationEnd = useCallback((e) => {
    if (closing && e.target === panelRef.current) {
      setMounted(false)
      setClosing(false)
    }
  }, [closing])

  if (!mounted) return null

  const enterAnim = {
    right: 'animate-slide-right',
    up: 'animate-slide-up',
    fade: 'animate-fade-in',
  }

  const exitAnim = {
    right: 'animate-slide-right-out',
    up: 'animate-slide-up-out',
    fade: 'animate-fade-out',
  }

  const panelAnimation = closing ? exitAnim[direction] : enterAnim[direction]
  const backdropAnimation = closing ? 'animate-fade-out' : 'animate-fade-in'

  return (
    <div className="fixed inset-0 flex" style={{ zIndex }}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-gray-900/20 backdrop-blur-sm ${backdropAnimation}`}
        onClick={onClose}
      />
      {/* Animated content panel */}
      <div
        ref={panelRef}
        className={`relative h-full ${panelAnimation} ${className}`}
        onAnimationEnd={handleAnimationEnd}
      >
        {children}
      </div>
    </div>
  )
}
