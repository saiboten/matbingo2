import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useSession, signOut } from '../lib/auth-client'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { isSuperAdmin } from '../lib/super-admin'
import {
  ChefHat,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  CalendarDays,
  BookOpen,
  ListChecks,
  ShoppingCart,
  Carrot,
  ShieldCheck,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Ukesmeny', icon: CalendarDays },
  { to: '/recipes', label: 'Oppskrifter', icon: BookOpen },
  { to: '/recipes/overview', label: 'Oppskriftsoversikt', icon: ListChecks },
  { to: '/shopping-lists', label: 'Handleliste', icon: ShoppingCart },
  { to: '/ingredients', label: 'Ingredienser', icon: Carrot },
] as const

// Only shown to the super admin
const ADMIN_ITEM = { to: '/admin/blueprints', label: 'Admin', icon: ShieldCheck } as const

const SETTINGS_ITEM = { to: '/settings', label: 'Innstillinger', icon: Settings } as const

function isActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  // The recipe list shouldn't light up on the overview page, which has its own entry
  if (to === '/recipes') return pathname.startsWith('/recipes') && !pathname.startsWith('/recipes/overview')
  return pathname.startsWith(to)
}

export default function Header() {
  const { data: session } = useSession()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the menu after navigating
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  if (!session) {
    return (
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <ChefHat className="h-6 w-6" />
            <span>Matbingo</span>
          </Link>
        </div>
      </header>
    )
  }

  const navItems = isSuperAdmin(session.user.email) ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <ChefHat className="h-6 w-6" />
          <span>Matbingo</span>
        </Link>

        {/* Wide screens: links in the bar */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'text-sm font-medium hover:text-primary transition-colors py-2',
                isActive(item.to, pathname) && 'text-primary'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={SETTINGS_ITEM.to}
            aria-label={SETTINGS_ITEM.label}
            className={cn(
              'text-sm font-medium hover:text-primary transition-colors py-2',
              isActive(SETTINGS_ITEM.to, pathname) && 'text-primary'
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2">
            {session.user.image ? (
              <img src={session.user.image} alt={session.user.name} className="h-8 w-8 rounded-full" />
            ) : (
              <User className="h-8 w-8 p-1 rounded-full bg-muted" />
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logg ut</span>
            </Button>
          </div>
        </nav>

        {/* Phones and tablets: one menu button with a dropdown */}
        <div ref={menuRef} className="relative lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Meny"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
            >
              {[...navItems, SETTINGS_ITEM].map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    role="menuitem"
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-accent',
                      isActive(item.to, pathname) && 'bg-accent text-primary'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}

              <div className="my-1 border-t" />

              <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <User className="h-6 w-6 p-1 rounded-full bg-muted" />
                )}
                <span className="min-w-0 truncate">{session.user.name}</span>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-accent"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Logg ut
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
