"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { SiteHeader } from "@/components/site-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  IconUserCircle,
  IconCamera
} from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile, updateProfile } = useAuth()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [fullName, setFullName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "")
    }
  }, [profile])

  if (loading) {
    return (
      <>
        <SiteHeader title="Profil" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!user || !profile) {
    return null
  }

  const userInitials = profile.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() 
    : user.email?.[0].toUpperCase() || 'U'

  const handleProfileSave = async () => {
    setSavingProfile(true)
    try {
      await updateProfile({ full_name: fullName })
      setIsEditingProfile(false)
      await refreshProfile()
      toast.success("Profil mis à jour avec succès")
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error)
      toast.error("Erreur lors de la mise à jour du profil")
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <>
      <SiteHeader title="Profil" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
            
            {/* Section Profil Utilisateur */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconUserCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Informations personnelles</CardTitle>
                      <CardDescription>
                        Gérez vos informations de profil
                      </CardDescription>
                    </div>
                  </div>
                  {!isEditingProfile && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                    >
                      Modifier
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name || user.email || ''} />
                      <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 h-7 w-7 rounded-full"
                      disabled
                    >
                      <IconCamera className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{profile.full_name || 'Sans nom'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="text-xs">
                      {profile.role === 'owner' ? 'Propriétaire' : 'Membre'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ''}
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="Entrez votre nom complet"
                    />
                  </div>
                </div>
              </CardContent>
              {isEditingProfile && (
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingProfile(false)
                      setFullName(profile.full_name || "")
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleProfileSave}
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}