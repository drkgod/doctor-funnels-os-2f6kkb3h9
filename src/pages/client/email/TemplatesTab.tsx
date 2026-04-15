import { useState, useEffect } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, Copy, Trash2, Edit } from 'lucide-react'
import { emailService, EmailTemplate } from '@/services/emailService'
import { toast } from 'sonner'
import { TemplateDialog } from './TemplateDialog'

interface Props {
  tenantId: string
  loading: boolean
  error: string | null
}

export function TemplatesTab({ tenantId, loading: initLoading, error: initError }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | undefined>()

  const loadData = async () => {
    if (!tenantId) return
    try {
      setLoading(true)
      const data = await emailService.fetchTemplates(tenantId)
      setTemplates(data)
    } catch (err: any) {
      toast.error('Erro ao carregar templates: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenantId])

  const filtered = templates.filter((t) => {
    if (category !== 'Todas' && t.category !== category.toLowerCase()) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Campanhas usando este template não serão afetadas.')) return
    try {
      await emailService.deleteTemplate(id)
      setTemplates(templates.filter((t) => t.id !== id))
      toast.success('Template removido')
    } catch (err: any) {
      toast.error('Erro ao excluir')
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await emailService.duplicateTemplate(id, tenantId)
      toast.success('Template duplicado')
      loadData()
    } catch (err: any) {
      toast.error('Erro ao duplicar')
    }
  }

  if (initError) return <div className="p-4 text-destructive">{initError}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-[250px]"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas">Todas</SelectItem>
              <SelectItem value="transacional">Transacional</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="automacao">Automação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate(undefined)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Template
        </Button>
      </div>

      {initLoading || loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-dashed">
          <p className="text-muted-foreground text-center">
            Nenhum template criado. Crie seu primeiro template para começar a enviar emails.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSelectedTemplate(undefined)
              setDialogOpen(true)
            }}
          >
            Criar Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 overflow-hidden">
                    <CardTitle className="text-base truncate" title={t.name}>
                      {t.name}
                    </CardTitle>
                    <CardDescription className="truncate text-xs" title={t.subject}>
                      {t.subject}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 flex gap-2">
                <Badge
                  variant={
                    t.category === 'transacional'
                      ? 'default'
                      : t.category === 'marketing'
                        ? 'secondary'
                        : 'outline'
                  }
                  className={
                    t.category === 'automacao' ? 'bg-success/20 text-success border-success/30' : ''
                  }
                >
                  {t.category}
                </Badge>
                {t.is_global && <Badge variant="secondary">Global</Badge>}
              </CardContent>
              <CardFooter className="pt-3 border-t flex justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(t.updated_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedTemplate(t)
                      setDialogOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDuplicate(t.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {dialogOpen && (
        <TemplateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          template={selectedTemplate}
          tenantId={tenantId}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
