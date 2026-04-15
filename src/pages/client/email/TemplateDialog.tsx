import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ChevronDown, Copy } from 'lucide-react'
import { emailService, EmailTemplate } from '@/services/emailService'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: EmailTemplate
  tenantId: string
  onSaved: () => void
}

export function TemplateDialog({ open, onOpenChange, template, tenantId, onSaved }: Props) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('marketing')
  const [htmlContent, setHtmlContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (template) {
      setName(template.name)
      setSubject(template.subject)
      setCategory(template.category)
      setHtmlContent(template.html_content)
    } else {
      setName('')
      setSubject('')
      setCategory('marketing')
      setHtmlContent(
        '<html>\n<body>\n  <h1>Olá PATIENT_NAME,</h1>\n  <p>Sua mensagem aqui.</p>\n</body>\n</html>',
      )
    }
  }, [template, open])

  const handleCopy = (variable: string) => {
    navigator.clipboard.writeText(variable)
    toast.success('Variável copiada')
  }

  const getPreviewHtml = () => {
    let content = htmlContent
    content = content.replace(/PATIENT_NAME/g, 'Ana Silva')
    content = content.replace(/PATIENT_EMAIL/g, 'ana@email.com')
    content = content.replace(/CLINIC_NAME/g, 'Clínica Exemplo')
    content = content.replace(/DOCTOR_NAME/g, 'Dr. Exemplo')
    return content
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const data = { name, subject, category: category as any, html_content: htmlContent }
      if (template) {
        await emailService.updateTemplate(template.id, data)
        toast.success('Template atualizado com sucesso')
      } else {
        await emailService.createTemplate(tenantId, data)
        toast.success('Template criado com sucesso')
      }
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar Template' : 'Novo Template'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do template *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Confirmação de consulta"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transacional">Transacional</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="automacao">Automação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assunto *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Sua consulta está confirmada, PATIENT_NAME"
            />
          </div>
          <Collapsible className="border rounded-md p-4 bg-muted/20">
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
              Variáveis disponíveis <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 flex flex-wrap gap-2">
              {['PATIENT_NAME', 'PATIENT_EMAIL', 'CLINIC_NAME', 'DOCTOR_NAME'].map((v) => (
                <Badge
                  key={v}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => handleCopy(v)}
                >
                  {v} <Copy className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </CollapsibleContent>
          </Collapsible>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Conteúdo HTML *</Label>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Preview</Label>
                <Switch checked={preview} onCheckedChange={setPreview} />
              </div>
            </div>
            {preview ? (
              <div
                className="border rounded-md min-h-[400px] p-4 bg-white text-black overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
              />
            ) : (
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                className="font-mono min-h-[400px] resize-y"
                placeholder="<html>...</html>"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {template ? 'Salvar' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
