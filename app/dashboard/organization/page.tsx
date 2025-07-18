"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  IconDotsVertical, 
  IconBuilding,
  IconUsers,
} from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function OrganizationPage() {
  const { user, profile, organization, loading, updateOrganization, updateMemberRole, getOrganizationMembers } = useAuth()
  const [isEditingOrg, setIsEditingOrg] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [members, setMembers] = useState<Array<{ id: string; full_name: string | null; organization_id: string | null; role: string; avatar_url: string | null; created_at: string }>>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [savingOrg, setSavingOrg] = useState(false)
  const [changingRole, setChangingRole] = useState<string | null>(null)

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || "")
    }
  }, [organization])

  useEffect(() => {
    const loadMembers = async () => {
      if (!organization) return
      
      setLoadingMembers(true)
      try {
        const members = await getOrganizationMembers()
        setMembers(members || [])
      } catch (error) {
        console.error('Erreur lors du chargement des membres:', error)
      } finally {
        setLoadingMembers(false)
      }
    }
    
    loadMembers()
  }, [organization, getOrganizationMembers])

  if (loading) {
    return (
      <>
        <SiteHeader title="Organisation" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!user || !profile || !organization) {
    return null
  }

  const isOwner = profile.role === 'owner'

  const handleOrgSave = async () => {
    setSavingOrg(true)
    try {
      await updateOrganization({ name: orgName })
      setIsEditingOrg(false)
      toast.success("Organisation mise à jour avec succès")
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'organisation:', error)
      toast.error("Erreur lors de la mise à jour de l'organisation")
    } finally {
      setSavingOrg(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setChangingRole(memberId)
    try {
      await updateMemberRole(memberId, newRole)
      // Recharger la liste des membres
      const updatedMembers = await getOrganizationMembers()
      setMembers(updatedMembers)
      toast.success("Rôle modifié avec succès")
    } catch (error: unknown) {
      // Log uniquement si ce n'est pas une erreur métier attendue
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      if (!errorMessage.includes('au moins un propriétaire')) {
        console.error('Erreur lors du changement de rôle:', error)
      }
      
      // Afficher le message d'erreur spécifique s'il existe
      if (errorMessage.includes('au moins un propriétaire')) {
        toast.error("Il doit y avoir au moins un propriétaire dans l'organisation")
      } else {
        toast.error("Erreur lors du changement de rôle")
      }
    } finally {
      setChangingRole(null)
    }
  }

  return (
    <>
      <SiteHeader title="Organisation" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
            
            {/* Section Organisation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconBuilding className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Informations de l&apos;organisation</CardTitle>
                      <CardDescription>
                        Gérez les paramètres de votre organisation
                      </CardDescription>
                    </div>
                  </div>
                  {isOwner && !isEditingOrg && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditingOrg(true)}
                    >
                      Modifier
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Nom de l&apos;organisation</Label>
                    <Input
                      id="orgName"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      disabled={!isEditingOrg || !isOwner}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domaine</Label>
                    <Input
                      id="domain"
                      type="text"
                      value={organization?.domain || ''}
                      disabled
                    />
                  </div>
                </div>
              </CardContent>
              {isEditingOrg && (
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingOrg(false)
                      setOrgName(organization?.name || "")
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOrgSave}
                    disabled={savingOrg}
                  >
                    {savingOrg ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Section Membres */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <IconUsers className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Membres de l&apos;organisation</CardTitle>
                    <CardDescription>
                      {loadingMembers ? 'Chargement...' : `${members.length} membre${members.length !== 1 ? 's' : ''}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <IconUsers className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Aucun autre membre dans l&apos;organisation</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membre</TableHead>
                        <TableHead>Rôle</TableHead>
                        {isOwner && <TableHead className="w-12"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback>
                                  {member.full_name?.[0] || member.id?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {member.full_name || 'Sans nom'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {member.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                              {member.role === 'owner' ? 'Propriétaire' : 'Membre'}
                            </Badge>
                          </TableCell>
                          {isOwner && (
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    disabled={changingRole === member.id}
                                  >
                                    <IconDotsVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.role === 'member' ? (
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(member.id, 'owner')}
                                      disabled={changingRole !== null}
                                    >
                                      Promouvoir en propriétaire
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(member.id, 'member')}
                                      disabled={changingRole !== null}
                                    >
                                      Rétrograder en membre
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}