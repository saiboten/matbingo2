import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSession } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { useToast } from '../../components/ui/toast'
import { buildInviteMessage } from '../../lib/family'
import type { Family } from '../../types'
import { Users, Copy, Check, LogOut, UserPlus, ChefHat, Share2, UserMinus } from 'lucide-react'

// A message to show after the page reloads (leaving the family reloads it to refresh the session)
const FLASH_KEY = 'matbingo:flash'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const { data: session, isPending } = useSession()
  const toast = useToast()
  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [creatingFamily, setCreatingFamily] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [newAdminId, setNewAdminId] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    try {
      const flash = sessionStorage.getItem(FLASH_KEY)
      if (flash) {
        sessionStorage.removeItem(FLASH_KEY)
        toast(flash)
      }
    } catch {
      // Storage can be unavailable; the message is just skipped
    }
  }, [])

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

  const handleShare = async () => {
    if (!family) return

    const message = buildInviteMessage({
      familyName: family.name,
      inviteCode,
      siteUrl: window.location.origin
    })

    try {
      await navigator.clipboard.writeText(message)
      toast('Invitasjonen er kopiert. Lim den inn i en melding.')
    } catch (error) {
      console.error('Error copying invitation:', error)
      toast('Kunne ikke kopiere invitasjonen. Prøv igjen.', 'error')
    }
  }

  const handleRemoveMember = async (member: { id: string; name: string }) => {
    if (!family) return
    if (!confirm(`Fjerne ${member.name} fra familien? Personen beholder kontoen sin og kan bli med igjen med invitasjonskoden.`)) return

    setRemovingId(member.id)
    try {
      const response = await fetch(
        `/api/family-members?familyId=${family.id}&userId=${member.id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast(`${member.name} er fjernet fra familien`)
        await fetchFamily()
      } else {
        const data = await response.json().catch(() => ({}))
        toast(data.error || 'Kunne ikke fjerne medlemmet', 'error')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast('Kunne ikke fjerne medlemmet', 'error')
    } finally {
      setRemovingId(null)
    }
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
        alert(error.error || 'Ugyldig invitasjonskode')
      }
    } catch (error) {
      console.error('Error joining family:', error)
      alert('Noe gikk galt da du skulle bli med i familien')
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
        alert('Kunne ikke opprette familien')
      }
    } catch (error) {
      console.error('Error creating family:', error)
      alert('Noe gikk galt da familien skulle opprettes')
    } finally {
      setCreatingFamily(false)
    }
  }

  const leaveFamily = async (handOverTo?: string) => {
    if (!family) return

    setLeaving(true)
    try {
      const response = await fetch('/api/family-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: family.id, newAdminId: handOverTo })
      })

      if (response.ok) {
        try {
          sessionStorage.setItem(FLASH_KEY, `Du har forlatt familien «${family.name}»`)
        } catch {
          // Without storage the page just reloads without the message
        }
        // Reload so the session picks up that the user no longer has a family
        window.location.reload()
        return
      }

      const data = await response.json().catch(() => ({}))
      toast(data.error || 'Kunne ikke forlate familien', 'error')
    } catch (error) {
      console.error('Error leaving family:', error)
      toast('Kunne ikke forlate familien', 'error')
    }
    setLeaving(false)
  }

  const handleLeaveFamily = () => {
    if (!family) return

    // The admin has to hand the role to someone else first
    if (family.adminId === session?.user.id) {
      if ((family.members?.length ?? 0) <= 1) {
        toast('Du er den eneste i familien. Inviter noen først, så kan du overføre administrasjonen og forlate familien.', 'error')
        return
      }
      setNewAdminId(null)
      setLeaveDialogOpen(true)
      return
    }

    if (!confirm(`Forlate familien «${family.name}»? Du kan bli med igjen senere med invitasjonskoden.`)) return
    leaveFamily()
  }

  if (isPending || loading) {
    return <div className="flex justify-center p-8">Laster ...</div>
  }

  // Not in a family - show join/create options
  if (!family) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Familieinnstillinger</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Bli med i en familie
            </CardTitle>
            <CardDescription>
              Skriv inn en invitasjonskode for å bli med i en eksisterende familie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Skriv inn koden på 8 tegn"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
              <Button 
                onClick={handleJoinFamily}
                disabled={joining || joinCode.length !== 8}
              >
                {joining ? 'Blir med ...' : 'Bli med'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Eller</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Opprett ny familie
            </CardTitle>
            <CardDescription>
              Start din egen familie og inviter andre
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="family-name">Familienavn</Label>
              <Input
                id="family-name"
                placeholder="f.eks. Familien Hansen"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleCreateFamily}
              disabled={creatingFamily || !newFamilyName.trim()}
              className="w-full"
            >
              {creatingFamily ? 'Oppretter ...' : 'Opprett familie'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // In a family - show family details
  const isAdmin = family.adminId === session?.user.id

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Familieinnstillinger</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            {family.name}
          </CardTitle>
          <CardDescription>
            Administrer familien og inviter medlemmer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invite Code */}
          <div className="space-y-2">
            <Label>Invitasjonskode</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-lg tracking-wider">
                {inviteCode}
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className="h-auto w-10"
                onClick={handleCopyCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">Kopier koden</span>
              </Button>
              <Button variant="outline" className="h-auto" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Del
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              «Del» kopierer en invitasjon med forklaring og kode, som du kan lime inn i en melding
            </p>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Familiemedlemmer ({family.members?.length || 0})
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
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>
                  {member.id === family.adminId && (
                    <Badge variant="outline">Administrator</Badge>
                  )}
                  {member.id === session?.user.id && (
                    <Badge variant="secondary">Deg</Badge>
                  )}
                  {isAdmin && member.id !== session?.user.id && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      disabled={removingId === member.id}
                      onClick={() => handleRemoveMember(member)}
                    >
                      <UserMinus className="h-4 w-4" />
                      <span className="sr-only">Fjern {member.name} fra familien</span>
                    </Button>
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
              Forlat familien
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* The admin picks who takes over before leaving */}
      <Dialog open={leaveDialogOpen} onOpenChange={(open) => !leaving && setLeaveDialogOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Velg ny administrator</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Du er administrator for «{family.name}». Før du forlater familien må noen andre overta.
          </p>

          <fieldset className="space-y-2">
            <legend className="sr-only">Ny administrator</legend>
            {family.members
              ?.filter((member) => member.id !== session?.user.id)
              .map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-muted"
                >
                  <input
                    type="radio"
                    name="new-admin"
                    value={member.id}
                    checked={newAdminId === member.id}
                    onChange={() => setNewAdminId(member.id)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{member.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </label>
              ))}
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={leaving} onClick={() => setLeaveDialogOpen(false)}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              disabled={!newAdminId || leaving}
              onClick={() => newAdminId && leaveFamily(newAdminId)}
            >
              {leaving ? 'Forlater ...' : 'Overfør og forlat familien'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
