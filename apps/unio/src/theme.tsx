import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const storageKey = 'unio-theme'

export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function apply() {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark') return
      document.documentElement.classList.toggle('dark', media.matches)
    }
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
  return null
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(storageKey, next ? 'dark' : 'light')
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      className={`grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:bg-[#F8FAFC] ${className}`}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
