import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useSession, signOut } from '../lib/auth-client'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { isSuperAdmin } from '../lib/super-admin'
import { useViewMode } from '../lib/use-simple-mode'
import {
  ChefHat,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Carrot,
  ShieldCheck,
  ListTodo,
  LayoutDashboard,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Ukesmeny', icon: CalendarDays },
  { to: '/recipes', label: 'Oppskrifter', icon: BookOpen },
  { to: '/shopping-lists', label: 'Handleliste', icon: ShoppingCart },
  { to: '/ingredients', label: 'Ingredienser', icon: Carrot },
] as const

// The only page in the simple mode (everyone but the family owner)
const SIMPLE_NAV_ITEMS = [{ to: '/simple', label: 'Handleliste', icon: ShoppingCart }] as const

// Only shown to the super admin
const ADMIN_ITEM = { to: '/admin/blueprints', label: 'Admin', icon: ShieldCheck } as const

// Buttons sitting on the coloured top bar
const HEADER_BUTTON =
  'border-header-foreground/30 bg-transparent text-header-foreground hover:bg-header-foreground/15 hover:text-header-foreground'

const SETTINGS_ITEM = { to: '/settings', label: 'Innstillinger', icon: Settings } as const

function isActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname.startsWith(to)
}

export default function Header() {
  const { data: session } = useSession()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { simple, setSimple } = useViewMode()
  const navigate = useNavigate()

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

  // Switches between the simple view (only the latest shopping list) and the full app
  const handleSwitchMode = () => {
    const goSimple = !simple
    setSimple(goSimple)
    setMenuOpen(false)
    navigate({ to: goSimple ? '/simple' : '/' })
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  if (!session) {
    return (
      <header className="border-b border-header bg-header text-header-foreground shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <ChefHat className="h-6 w-6 text-header-accent" />
            <span>Matbingo</span>
          </Link>
        </div>
      </header>
    )
  }

  // While the view is being looked up no links are shown, so nobody sees the wrong menu for a moment
  const lookingUpView = simple === null && Boolean(session.user.familyId)
  const navItems = lookingUpView
    ? []
    : simple
    ? SIMPLE_NAV_ITEMS
    : isSuperAdmin(session.user.email)
      ? [...NAV_ITEMS, ADMIN_ITEM]
      : NAV_ITEMS

  return (
    <header className="border-b border-header bg-header text-header-foreground shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <ChefHat className="h-6 w-6 text-header-accent" />
          <span>Matbingo</span>
        </Link>

        {/* Wide screens: links in the bar */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'text-sm font-medium text-header-foreground/80 hover:text-header-foreground transition-colors py-2 border-b-2 border-transparent',
                isActive(item.to, pathname) && 'text-header-foreground border-header-accent'
              )}
            >
              {item.label}
            </Link>
          ))}
          {simple !== null && (
            <Button variant="outline" size="sm" onClick={handleSwitchMode} className={HEADER_BUTTON}>
              {simple ? <LayoutDashboard className="mr-1 h-4 w-4" /> : <ListTodo className="mr-1 h-4 w-4" />}
              {simple ? 'Full visning' : 'Enkel visning'}
            </Button>
          )}
          <Link
            to={SETTINGS_ITEM.to}
            aria-label={SETTINGS_ITEM.label}
            className={cn(
              'text-sm font-medium text-header-foreground/80 hover:text-header-foreground transition-colors py-2',
              isActive(SETTINGS_ITEM.to, pathname) && 'text-header-accent'
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2">
            {session.user.image ? (
              <img src={session.user.image} alt={session.user.name} className="h-8 w-8 rounded-full" />
            ) : (
              <User className="h-8 w-8 p-1 rounded-full bg-header-foreground/15" />
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut} className={HEADER_BUTTON}>
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
            className={HEADER_BUTTON}
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

              {simple !== null && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSwitchMode}
                  className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-accent"
                >
                  {simple ? <LayoutDashboard className="h-4 w-4 shrink-0" /> : <ListTodo className="h-4 w-4 shrink-0" />}
                  {simple ? 'Bytt til full visning' : 'Bytt til enkel visning'}
                </button>
              )}

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
