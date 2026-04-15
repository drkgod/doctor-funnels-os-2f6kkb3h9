import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { botService } from '@/services/botService'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { FileText, File, UploadCloud, ChevronDown, ArrowLeft, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const modelLabels: Record<string, string> = {
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'claude-sonnet': 'Claude Sonnet',
  'claude-haiku': 'Claude Haiku',
}

const VARIABLES = ['TENANT_NAME', 'DOCTOR_NAME', 'SPECIALTY', 'BUSINESS_HOURS', 'ADDRESS', 'PHONE']

const StatusBadge = ({ status }: { status: string }) => {
  const isActive = status === 'active'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
        isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          isActive ? 'bg-success' : 'bg-muted-foreground',
        )}
      />
      {isActive ? 'Ativo' : 'Pausado'}
    </span>
  )
}

const EmbeddingStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#Edb913]/10 text-[#Edb913]">
          Pendente
        </span>
      )
    case 'processing':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
          Processando
        </span>
      )
    case 'ready':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/10 text-success">
          Pronto
        </span>
      )
    case 'error':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive">
          Erro
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
          {status}
        </span>
      )
  }
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <FileText className="w-5 h-5 text-destructive shrink-0" />
  if (ext === 'doc' || ext === 'docx') return <FileText className="w-5 h-5 text-primary shrink-0" />
  if (ext === 'txt') return <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
  return <File className="w-5 h-5 text-muted-foreground shrink-0" />
}

export default function BotDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [model, setModel] = useState('gpt-4o')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [ragEnabled, setRagEnabled] = useState(false)
  const [status, setStatus] = useState('paused')
  const [systemPrompt, setSystemPrompt] = useState('')

  const [isVariablesOpen, setIsVariablesOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [docToDelete, setDocToDelete] = useState<any>(null)

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { config: c, documents: d } = await botService.fetchBotConfigById(id)
      setConfig(c)
      setDocuments(d)
      setModel(c.model)
      setTemperature(c.temperature)
      setMaxTokens(c.max_tokens)
      setRagEnabled(c.rag_enabled)
      setStatus(c.status)
      setSystemPrompt(c.system_prompt || '')
    } catch (e) {
      setError('Não foi possível carregar o chatbot. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleSaveConfig = async () => {
    try {
      await botService.updateBotConfig(id!, {
        model,
        temperature,
        max_tokens: maxTokens,
        rag_enabled: ragEnabled,
        status,
      })
      toast({ description: 'Configurações salvas com sucesso' })
      loadData()
    } catch (e) {
      toast({ description: 'Erro ao salvar configurações', variant: 'destructive' })
    }
  }

  const handleSavePrompt = async () => {
    try {
      await botService.updateBotConfig(id!, { system_prompt: systemPrompt })
      toast({ description: 'Prompt salvo com sucesso' })
      loadData()
    } catch (e) {
      toast({ description: 'Erro ao salvar prompt', variant: 'destructive' })
    }
  }

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>,
  ) => {
    let file: File | undefined
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files?.[0]
    } else {
      const input = e.target as HTMLInputElement
      file = input.files?.[0]
    }

    if (!file) return

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const validExts = ['pdf', 'txt', 'doc', 'docx']

    if (!validExts.includes(fileExt || '')) {
      toast({
        description: 'Formato não suportado. Use PDF, TXT, DOC ou DOCX.',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ description: 'Arquivo muito grande. Máximo 10MB.', variant: 'destructive' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setUploadProgress(10)
    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 90 ? p + 10 : p))
      }, 200)

      await botService.uploadBotDocument(config.tenant_id, config.id, file)

      clearInterval(interval)
      setUploadProgress(100)
      toast({
        description: 'Documento enviado com sucesso. O processamento pode levar alguns minutos.',
      })
      loadData()
    } catch (err) {
      toast({ description: 'Erro ao enviar documento', variant: 'destructive' })
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return
    try {
      await botService.deleteBotDocument(docToDelete.id, docToDelete.file_url)
      toast({ description: 'Documento excluído' })
      setDocToDelete(null)
      loadData()
    } catch (err) {
      toast({ description: 'Erro ao excluir documento', variant: 'destructive' })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ description: 'Variável copiada para a área de transferência.' })
  }

  if (loading) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <style>{`
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
          .shimmer-bg {
            position: relative;
            overflow: hidden;
            background-color: hsl(var(--secondary) / 0.3);
          }
          .shimmer-bg::after {
            content: "";
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            transform: translateX(-100%);
            background-image: linear-gradient(90deg, transparent, hsl(var(--secondary) / 0.5), transparent);
            animation: shimmer 1.5s infinite;
          }
        `}</style>

        <div className="mb-6">
          <button className="text-[13px] text-muted-foreground flex items-center gap-1 mb-4 opacity-50 cursor-default">
            <ArrowLeft className="w-4 h-4" />
            Voltar aos bots
          </button>
          <div className="shimmer-bg h-8 w-64 rounded mb-2" />
          <div className="shimmer-bg h-5 w-48 rounded" />
        </div>

        <div className="p-[24px] bg-card border border-border rounded-md mb-[24px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[16px]">
            <div className="shimmer-bg h-10 rounded-md w-full" />
            <div className="shimmer-bg h-10 rounded-md w-[100px]" />
          </div>
          <div className="grid grid-cols-1 gap-[16px]">
            <div className="shimmer-bg h-10 rounded-md w-[120px]" />
            <div className="shimmer-bg h-6 w-48 rounded" />
          </div>
        </div>

        <div className="p-[24px] bg-card border border-border rounded-md mb-[24px]">
          <div className="shimmer-bg h-[320px] rounded-md w-full" />
        </div>

        <div className="p-[24px] bg-card border border-border rounded-md mb-[24px]">
          <div className="space-y-[8px]">
            <div className="shimmer-bg h-[50px] w-full rounded-md" />
            <div className="shimmer-bg h-[50px] w-full rounded-md" />
            <div className="shimmer-bg h-[50px] w-full rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto text-center mt-20">
        <p className="text-destructive mb-4 text-lg">{error || 'Bot não encontrado'}</p>
        <Button variant="outline" onClick={() => navigate('/admin/bots')}>
          Voltar aos bots
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <button
        onClick={() => navigate('/admin/bots')}
        className="text-[13px] text-muted-foreground hover:text-primary flex items-center gap-1 mb-[16px] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar aos bots
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Configurar Chatbot</h1>
          <StatusBadge status={config.status} />
        </div>
        <p className="text-[14px] text-muted-foreground mt-1">{config.tenant_name}</p>
      </div>

      <div className="p-[24px] bg-card border border-border rounded-md mb-[24px]">
        <h2 className="text-[16px] font-semibold mb-[20px]">Configuração do Bot</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <div>
            <Label className="text-[13px] font-medium text-muted-foreground mb-[4px] block">
              Modelo
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-10 text-[14px] border-border rounded-md w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(modelLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[13px] font-medium text-muted-foreground mb-[4px] block">
              Temperatura
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="h-10 text-[14px] border-border rounded-md w-[100px]"
            />
          </div>

          <div>
            <Label className="text-[13px] font-medium text-muted-foreground mb-[4px] block">
              Max Tokens
            </Label>
            <Input
              type="number"
              step="128"
              min="256"
              max="4096"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="h-10 text-[14px] border-border rounded-md w-[120px]"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch id="rag-toggle" checked={ragEnabled} onCheckedChange={setRagEnabled} />
            <Label htmlFor="rag-toggle" className="text-[14px] cursor-pointer">
              Habilitar RAG (busca em documentos)
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="status-toggle"
              checked={status === 'active'}
              onCheckedChange={(c) => setStatus(c ? 'active' : 'paused')}
            />
            <Label
              htmlFor="status-toggle"
              className={cn(
                'text-[14px] cursor-pointer',
                status === 'active' ? 'text-success font-semibold' : 'text-muted-foreground',
              )}
            >
              {status === 'active' ? 'Bot Ativo' : 'Bot Pausado'}
            </Label>
          </div>
        </div>

        <Button onClick={handleSaveConfig} className="h-10 mt-[24px] px-[24px] font-semibold">
          Salvar Configurações
        </Button>
      </div>

      <div className="p-[24px] bg-card border border-border rounded-md mb-[24px]">
        <h2 className="text-[16px] font-semibold mb-[20px]">Prompt do Sistema</h2>

        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Digite o prompt do sistema para este chatbot. Exemplo: Você é um assistente virtual da clínica do Dr. Silva. Responda dúvidas sobre horários, especialidades e agendamento."
          className="min-h-[320px] font-mono text-[13px] leading-[1.6] p-[16px] border border-border rounded-md bg-input focus:ring-2 focus:ring-ring resize-y placeholder:text-muted-foreground/50"
        />
        <div className="text-[12px] text-muted-foreground text-right mt-[4px]">
          {systemPrompt.length} caracteres
        </div>

        <Collapsible open={isVariablesOpen} onOpenChange={setIsVariablesOpen} className="mt-[16px]">
          <CollapsibleTrigger className="flex items-center text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group">
            Variáveis disponíveis
            <ChevronDown
              className={cn(
                'ml-1 w-[14px] h-[14px] transition-transform duration-200',
                isVariablesOpen && 'rotate-180',
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-[12px] flex flex-wrap gap-[8px]">
            {VARIABLES.map((v) => (
              <button
                key={v}
                onClick={() => copyToClipboard(`{{${v}}}`)}
                className="text-[12px] font-mono px-[10px] py-[4px] rounded-[6px] bg-secondary border border-border cursor-pointer hover:bg-primary/10 hover:border-primary/30 active:scale-95 transition-all duration-150"
              >
                {v}
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Button
          variant="outline"
          onClick={handleSavePrompt}
          className="h-10 mt-[16px] font-semibold"
        >
          Salvar Prompt
        </Button>
      </div>

      {ragEnabled && (
        <div
          className="p-[24px] bg-card border border-solid border-border rounded-md mb-[24px] pt-[24px]"
          style={{ borderTopStyle: 'dashed' }}
        >
          <h2 className="text-[16px] font-semibold mb-[20px]">Documentos RAG</h2>

          <div
            className={cn(
              'border-2 border-dashed rounded-md p-[40px] text-center transition-colors cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-secondary/5',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              handleFileSelect(e)
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-[32px] h-[32px] text-muted-foreground mx-auto" />
            <p className="text-[14px] text-muted-foreground mt-[8px]">
              Arraste um arquivo ou clique para enviar
            </p>
            <p className="text-[12px] text-muted-foreground/70 mt-[4px]">
              PDF, TXT, DOC, DOCX até 10MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileSelect}
            />

            {uploading && (
              <div className="mt-[16px] max-w-xs mx-auto">
                <div className="h-[4px] rounded-[2px] bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-[20px]">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center p-[12px] px-[16px] border border-border rounded-md mb-[8px]"
                >
                  {getFileIcon(doc.file_name)}
                  <span className="text-[14px] font-medium ml-3 flex-grow truncate">
                    {doc.file_name}
                  </span>

                  <EmbeddingStatusBadge status={doc.embedding_status} />
                  {doc.embedding_status === 'ready' && (
                    <span className="text-[12px] text-muted-foreground ml-[8px]">
                      {doc.chunk_count} chunks
                    </span>
                  )}

                  <span className="text-[12px] text-muted-foreground ml-4 hidden md:inline-block">
                    {formatDistanceToNow(new Date(doc.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-[28px] h-[28px] ml-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                    onClick={() => setDocToDelete(doc)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-[32px] text-center">
                <FileText className="w-[32px] h-[32px] text-muted-foreground mx-auto" />
                <h3 className="text-[14px] font-medium mt-[8px]">Nenhum documento</h3>
                <p className="text-[13px] text-muted-foreground mt-[4px]">
                  Envie documentos para que o bot possa consultar durante as conversas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={!!docToDelete} onOpenChange={(o) => !o && setDocToDelete(null)}>
        <DialogContent className="max-w-[480px] p-6 rounded-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold">Excluir documento</DialogTitle>
            <DialogDescription className="text-[14px] leading-[1.6] mt-2">
              Tem certeza que deseja excluir o documento{' '}
              <span className="font-semibold">{docToDelete?.file_name}</span>? Ele não será mais
              usado pelo chatbot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setDocToDelete(null)} className="h-10">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteDoc}
              className="h-10 text-white bg-destructive"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
