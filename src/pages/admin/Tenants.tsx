import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Search, Plus, MoreVertical, AlertCircle } from 'lucide-react'
import { tenantService } from '@/services/tenantService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'

type TenantState = 'loading' | 'empty' | 'error' | 'success'

export default function Tenants() {
  const [state, setState] = useState<TenantState>('loading')
  const [tenants, setTenants] = useState<any[]>([])
  const [plan, setPlan] = useState('Todos os planos')
  const [status, setStatus] = useState('Todos os status')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newTenant, setNewTenant] = useState({ name: '', slug: '', plan: 'essential' })
  const [isCreating, setIsCreating] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadTenants = async () => {
    setState('loading')
    try {
      const { data } = await tenantService.fetchTenants({ plan, status, search })
      setTenants(data || [])
      setState(data && data.length > 0 ? 'success' : 'empty')
    } catch (error) {
      setState('error')
      toast.error('Erro ao carregar tenants')
    }
  }

  useEffect(() => {
    loadTenants()
  }, [plan, status, search])

  const handleCreate = async () => {
    if (!newTenant.name || !newTenant.slug) return
    setIsCreating(true)
    try {
      await tenantService.createTenant(newTenant.name, newTenant.slug, newTenant.plan)
      toast.success('Tenant criado com sucesso')
      setIsNewOpen(false)
      setNewTenant({ name: '', slug: '', plan: 'essential' })
      loadTenants()
    } catch (error) {
      toast.error('Erro ao criar tenant')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await tenantService.deleteTenant(deleteId)
      toast.success('Tenant excluído')
      setDeleteId(null)
      loadTenants()
    } catch (error) {
      toast.error('Erro ao excluir tenant')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleStatus = async (tenant: any) => {
    try {
      const newStatus = tenant.status === 'active' ? 'suspended' : 'active'
      await tenantService.updateTenant(tenant.id, { status: newStatus })
      toast.success('Status atualizado')
      loadTenants()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Tenants</h1>
        <p className="text-muted-foreground mt-2">Administração de clínicas e assinaturas</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex flex-1 w-full sm:w-auto gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clínica..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos os planos">Todos os planos</SelectItem>
              <SelectItem value="Essential">Essential</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Clinic">Clinic</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos os status">Todos os status</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Trial">Trial</SelectItem>
              <SelectItem value="Suspenso">Suspenso</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tenant
        </Button>
      </div>

      {state === 'loading' && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Erro ao carregar</h3>
          <Button variant="outline" onClick={loadTenants} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      )}

      {state === 'empty' && (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg border-dashed">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhum tenant cadastrado</h3>
          <Button onClick={() => setIsNewOpen(true)} className="mt-4">
            Criar Tenant
          </Button>
        </div>
      )}

      {state === 'success' && (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Módulos Ativos</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Link
                      to={`/admin/tenants/${tenant.id}`}
                      className="font-medium hover:underline text-primary"
                    >
                      {tenant.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.plan === 'professional'
                          ? 'default'
                          : tenant.plan === 'clinic'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {tenant.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.status === 'active'
                          ? 'default'
                          : tenant.status === 'suspended'
                            ? 'destructive'
                            : tenant.status === 'trial'
                              ? 'secondary'
                              : 'outline'
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tenant.tenant_modules?.filter((m: any) => m.is_enabled).length || 0} / 8
                  </TableCell>
                  <TableCell>{format(new Date(tenant.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/tenants/${tenant.id}`}>Editar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(tenant)}>
                          {tenant.status === 'active' ? 'Suspender' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(tenant.id)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da clínica</Label>
              <Input
                value={newTenant.name}
                onChange={(e) =>
                  setNewTenant({
                    ...newTenant,
                    name: e.target.value,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, ''),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={newTenant.slug}
                onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select
                value={newTenant.plan}
                onValueChange={(val) => setNewTenant({ ...newTenant, plan: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !newTenant.name}>
              {isCreating ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir tenant</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir? Dados serão perdidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
