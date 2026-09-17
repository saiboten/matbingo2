import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import type { Family } from '../../types'
import { Users, Copy, Check, LogOut, UserPlus, ChefHat } from 'lucide-react'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const { data: session, isPending } = useSession()
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [creatingFamily, setCreatingFamily] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState('')

  useEffect(() => {
    if (session?.user.familyId) {
      fetchFamily()
    } else {
      setLoading(false)
    }
  }, [session])

  const fetchFamily = async () => {
    if (!session?.user.familyId) return

    try {
      const response = await fetch(`/api/family?familyId=${session.user.familyId}`)
      const data = await response.json()
      if (data.family) {
        setFamily(data.family)
        setInviteCode(data.family.inviteCode)
      }
    } catch (error) {
      console.error('Error fetching family:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinFamily = async () => {
    if (!joinCode.trim() || !session?.user.id) return

    setJoining(true)
    try {
      const response = await fetch('/api/join-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: joinCode.trim().toUpperCase(),
          userId: session.user.id
        })
      })

      if (response.ok) {
        window.location.reload()
      } else {
        const error = await response.json()
        alert(error.error || 'Invalid invite code')
      }
    } catch (error) {
      console.error('Error joining family:', error)
      alert('Error joining family')
    } finally {
      setJoining(false)
    }
  }

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim() || !session?.user.id) return

    setCreatingFamily(true)
    try {
      const response = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFamilyName.trim(),
          userId: session.user.id
        })
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to create family')
      }
    } catch (error) {
      console.error('Error creating family:', error)
      alert('Error creating family')
    } finally {
      setCreatingFamily(false)
    }
  }

  const handleLeaveFamily = async () => {
    if (!confirm('Are you sure you want to leave this family?')) return

    try {
      // In a real app, you'd have an API endpoint for this
      alert('Feature coming soon')
    } catch (error) {
      console.error('Error leaving family:', error)
    }
  }

  if (isPending || loading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  // Not in a family - show join/create options
  if (!family) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Family Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Join a Family
            </CardTitle>
            <CardDescription>
              Enter an invite code to join an existing family
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter 8-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
              <Button 
                onClick={handleJoinFamily}
                disabled={joining || joinCode.length !== 8}
              >
                {joining ? 'Joining...' : 'Join'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Create New Family
            </CardTitle>
            <CardDescription>
              Start your own family and invite others
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="family-name">Family Name</Label>
              <Input
                id="family-name"
                placeholder="e.g., The Smiths"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleCreateFamily}
              disabled={creatingFamily || !newFamilyName.trim()}
              className="w-full"
            >
              {creatingFamily ? 'Creating...' : 'Create Family'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // In a family - show family details
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Family Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            {family.name}
          </CardTitle>
          <CardDescription>
            Manage your family and invite members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Code */}
          <div className="space-y-2">
            <Label>Invite Code</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-lg tracking-wider">
                {inviteCode}
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleCopyCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code with family members to invite them
            </p>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Family Members ({family.members?.length || 0})
            </Label>
            <div className="space-y-2">
              {family.members?.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  {member.image ? (
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  {member.id === session?.user.id && (
                    <Badge variant="secondary">You</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave Family */}
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleLeaveFamily}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Family
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
