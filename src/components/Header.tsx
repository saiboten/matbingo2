import { Link } from '@tanstack/react-router'
import { useSession, signOut } from '../lib/auth-client'
import { Button } from './ui/button'
import { ChefHat, Settings, LogOut, User } from 'lucide-react'

export default function Header() {
  const { data: session } = useSession()

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

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <ChefHat className="h-6 w-6" />
          <span className="hidden sm:inline">Matbingo</span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6">
          <Link 
            to="/" 
            className="text-xs sm:text-sm font-medium hover:text-primary transition-colors py-2"
            activeProps={{ className: 'text-primary' }}
          >
            Ukesmeny
          </Link>
          <Link 
            to="/recipes" 
            className="text-xs sm:text-sm font-medium hover:text-primary transition-colors py-2"
            activeProps={{ className: 'text-primary' }}
          >
            Oppskrifter
          </Link>
          <Link 
            to="/shopping-lists" 
            className="text-xs sm:text-sm font-medium hover:text-primary transition-colors py-2"
            activeProps={{ className: 'text-primary' }}
          >
            Handleliste
          </Link>
          <Link 
            to="/ingredients" 
            className="hidden sm:inline text-sm font-medium hover:text-primary transition-colors py-2"
            activeProps={{ className: 'text-primary' }}
          >
            Ingredienser
          </Link>
          <Link 
            to="/settings" 
            className="text-xs sm:text-sm font-medium hover:text-primary transition-colors py-2"
            activeProps={{ className: 'text-primary' }}
          >
            <Settings className="h-4 w-4" />
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {session.user.image ? (
              <img 
                src={session.user.image} 
                alt={session.user.name} 
                className="hidden sm:block h-8 w-8 rounded-full"
              />
            ) : (
              <User className="hidden sm:block h-8 w-8 p-1 rounded-full bg-muted" />
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}
