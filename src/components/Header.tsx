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
            <span>Recipe Planner</span>
          </Link>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <ChefHat className="h-6 w-6" />
          <span>Recipe Planner</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link 
            to="/" 
            className="text-sm font-medium hover:text-primary transition-colors"
            activeProps={{ className: 'text-primary' }}
          >
            Meal Plan
          </Link>
          <Link 
            to="/recipes" 
            className="text-sm font-medium hover:text-primary transition-colors"
            activeProps={{ className: 'text-primary' }}
          >
            Recipes
          </Link>
          <Link 
            to="/settings" 
            className="text-sm font-medium hover:text-primary transition-colors"
            activeProps={{ className: 'text-primary' }}
          >
            <Settings className="h-4 w-4" />
          </Link>
          
          <div className="flex items-center gap-2">
            {session.user.image ? (
              <img 
                src={session.user.image} 
                alt={session.user.name} 
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <User className="h-8 w-8 p-1 rounded-full bg-muted" />
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
