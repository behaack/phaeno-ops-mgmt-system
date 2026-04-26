import { Monitor, Moon, Sun } from 'lucide-react'

import { useThemeMode } from './theme-mode'
import { Button } from '#/components/ui/button'

export default function ThemeToggle() {
  const { mode, setMode } = useThemeMode()

  function toggleMode() {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light')
  }

  const label =
    mode === 'auto'
      ? 'Theme mode: auto (system). Click to switch to light mode.'
      : `Theme mode: ${mode}. Click to switch mode.`

  return (
    <Button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      variant="outline"
      size="icon"
    >
      {mode === 'auto' ? (
        <Monitor aria-hidden="true" />
      ) : mode === 'dark' ? (
        <Moon aria-hidden="true" />
      ) : (
        <Sun aria-hidden="true" />
      )}
    </Button>
  )
}
