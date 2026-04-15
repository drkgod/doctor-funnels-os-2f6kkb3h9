import { useState, useEffect, useRef, useCallback } from 'react'
import { GenericPage } from '@/components/GenericPage'
import { ModuleGate } from '@/components/ModuleGate'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  MessageCircle,
  Bot,
  User as UserIcon,
  Check,
  CheckCheck,
  Send,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'

type InstanceStatus = 'disconnected' | 'connecting' | 'connected' | 'loading' | 'error'

export default function Whatsapp() {
  return (
    <ModuleGate moduleKey="whatsapp">
      <GenericPage title="WhatsApp" subtitle="Atendimento centralizado multicanal">
        <div className="h-[calc(100vh-140px)] -mt-4">
          <WhatsappInterface />
        </div>
      </GenericPage>
    </ModuleGate>
  )
}

function WhatsappInterface() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [status, setStatus] = useState<InstanceStatus>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setTenantId(data?.tenant_id || null)
        })
    }
  }, [user])

  const checkStatus = useCallback(async () => {
    if (!tenantId) return
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-status')
      if (error) throw error
      if (data?.status) {
        setStatus(data.status)
        if (data.qrcode) setQrCode(data.qrcode)
        setErrorMsg(null)
      } else {
        setStatus('disconnected')
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMsg('Erro ao conectar com servidor.')
    }
  }, [tenantId])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const connect = async () => {
    setStatus('connecting')
    setErrorMsg(null)
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect')
      if (error) throw error
      if (data?.qrcode) {
        setQrCode(data.qrcode)
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMsg('Erro ao iniciar conexao.')
    }
  }

  useEffect(() => {
    if (status === 'connecting') {
      const interval = setInterval(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('whatsapp-status')
          if (error) throw error
          if (data?.status === 'connected') {
            setStatus('connected')
            clearInterval(interval)
          } else if (data?.status === 'disconnected') {
            setStatus('disconnected')
            toast({ description: 'QR Code expirou. Tente novamente.', variant: 'destructive' })
            clearInterval(interval)
          } else if (data?.qrcode && data.qrcode !== qrCode) {
            setQrCode(data.qrcode)
          }
        } catch (e) {
          // Ignore transient
        }
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [status, qrCode, toast])

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md mx-auto mt-20">
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando status do WhatsApp...</p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <Card className="w-full max-w-md mx-auto mt-20">
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h3 className="text-xl font-semibold">Erro de Conexao</h3>
          <p className="text-muted-foreground">
            {errorMsg || 'Nao foi possivel carregar o status.'}
          </p>
          <Button onClick={checkStatus} variant="outline" className="mt-4">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (status === 'disconnected') {
    return (
      <Card className="w-full max-w-md mx-auto mt-20 shadow-lg border-primary/10">
        <CardContent className="pt-10 flex flex-col items-center justify-center min-h-[350px] text-center px-8">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Conectar WhatsApp</h3>
          <p className="text-muted-foreground mb-8">
            Conecte o WhatsApp Business da sua clinica para receber e enviar mensagens aos
            pacientes.
          </p>
          <Button size="lg" onClick={connect} className="w-full font-semibold">
            Conectar WhatsApp
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (status === 'connecting') {
    return (
      <Card className="w-full max-w-md mx-auto mt-20 shadow-lg">
        <CardContent className="pt-8 flex flex-col items-center justify-center text-center px-8">
          <h3 className="text-xl font-semibold mb-6">Escaneie o QR Code</h3>
          {qrCode ? (
            <div className="bg-white p-4 rounded-xl shadow-inner border mb-6">
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="WhatsApp QR Code"
                className="w-64 h-64 object-contain"
              />
            </div>
          ) : (
            <Skeleton className="w-64 h-64 rounded-xl mb-6" />
          )}
          <p className="text-sm font-medium mb-2">
            Abra o WhatsApp Business no seu celular, va em Aparelhos Conectados e escaneie o QR Code
            acima.
          </p>
          <p className="text-xs text-muted-foreground">O QR Code expira em 2 minutos.</p>
          <Button
            variant="ghost"
            onClick={() => setStatus('disconnected')}
            className="mt-6 text-muted-foreground"
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <ChatInterface tenantId={tenantId!} />
}

interface Conversation {
  id: string
  phone_number: string
  last_message_at: string
  is_bot_active: boolean
  unread_count: number
  patient_id?: string
  patient?: { full_name: string }
  lastMessagePreview?: string
}

interface Message {
  id: string
  content: string
  created_at: string
  direction: string
  sender_type: string
  message_type: string
  delivery_status?: string
  isOptimistic?: boolean
  isError?: boolean
  conversation_id?: string
}

function ChatInterface({ tenantId }: { tenantId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [search, setSearch] = useState('')
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [inputText, setInputText] = useState('')
  const [searchParams] = useSearchParams()
  const phoneParam = searchParams.get('phone')
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef<string | null>(null)

  selectedIdRef.current = selectedConv?.id || null

  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true)
    const { data: convData } = await supabase
      .from('conversations')
      .select('*, patient:patients(full_name)')
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false })
      .limit(30)

    if (convData) {
      const ids = convData.map((c) => c.id)
      if (ids.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('conversation_id, content')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false })

        const prepped = convData.map((c) => {
          const m = msgs?.find((msg) => msg.conversation_id === c.id)
          return {
            ...c,
            patient: Array.isArray(c.patient) ? c.patient[0] : c.patient,
            lastMessagePreview: m?.content?.substring(0, 50),
          }
        })
        setConversations(prepped as any)
      } else {
        setConversations([])
      }
    }
    setLoadingConvs(false)
  }, [tenantId])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (phoneParam && conversations.length > 0) {
      const existing = conversations.find((c) => c.phone_number === phoneParam)
      if (existing && !selectedConv) {
        selectConversation(existing)
      } else if (!existing && !selectedConv) {
        const createNew = async () => {
          const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('phone', phoneParam)
            .eq('tenant_id', tenantId)
            .limit(1)
            .single()
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              tenant_id: tenantId,
              patient_id: patient?.id,
              phone_number: phoneParam,
              last_message_at: new Date().toISOString(),
              status: 'active',
              is_bot_active: true,
              unread_count: 0,
            })
            .select('*, patient:patients(full_name)')
            .single()

          if (newConv) {
            setConversations((prev) => [newConv as any, ...prev])
            selectConversation(newConv as any)
          }
        }
        createNew()
      }
    }
  }, [phoneParam, conversations, selectedConv, tenantId])

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv)
    setLoadingMessages(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setMessages(data.reverse())
      setTimeout(() => scrollToBottom(), 100)
    }

    if (conv.unread_count > 0) {
      await supabase.from('conversations').update({ unread_count: 0 }).eq('id', conv.id)
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)),
      )
    }

    setLoadingMessages(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const channel = supabase
      .channel('whatsapp_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          if (newMessage.conversation_id === selectedIdRef.current) {
            setMessages((prev) => {
              const filtered = prev.filter(
                (m) => !(m.isOptimistic && m.content === newMessage.content),
              )
              return [...filtered, newMessage]
            })
            setTimeout(scrollToBottom, 100)
          } else {
            setConversations((prev) => {
              const idx = prev.findIndex((c) => c.id === newMessage.conversation_id)
              if (idx >= 0) {
                const updated = [...prev]
                updated[idx] = {
                  ...updated[idx],
                  lastMessagePreview: newMessage.content.substring(0, 50),
                  unread_count: updated[idx].unread_count + 1,
                  last_message_at: newMessage.created_at,
                }
                return updated.sort(
                  (a, b) =>
                    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
                )
              }
              return prev
            })
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const updated = payload.new as Message
          if (updated.conversation_id === selectedIdRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updated.id || (m.isOptimistic && m.content === updated.content)
                  ? updated
                  : m,
              ),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId])

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedConv) return

    const text = inputText.trim()
    setInputText('')

    const tempId = `temp-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      content: text,
      created_at: new Date().toISOString(),
      direction: 'outbound',
      sender_type: 'human',
      message_type: 'text',
      isOptimistic: true,
      delivery_status: 'sending',
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setTimeout(scrollToBottom, 100)

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { number: selectedConv.phone_number, text, conversationId: selectedConv.id },
      })
      if (error || !data.success) throw new Error()
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, isError: true, delivery_status: 'failed' } : m)),
      )
      toast({ description: 'Nao foi possivel enviar. Tente novamente.', variant: 'destructive' })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const toggleBot = async () => {
    if (!selectedConv) return
    const newState = !selectedConv.is_bot_active
    await supabase
      .from('conversations')
      .update({ is_bot_active: newState })
      .eq('id', selectedConv.id)
    setSelectedConv((prev) => (prev ? { ...prev, is_bot_active: newState } : null))
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConv.id ? { ...c, is_bot_active: newState } : c)),
    )
    toast({
      description: newState ? 'Bot reativado para esta conversa' : 'Voce assumiu a conversa',
    })
  }

  const filteredConvs = conversations.filter((c) => {
    const term = search.toLowerCase()
    return c.patient?.full_name?.toLowerCase().includes(term) || c.phone_number.includes(term)
  })

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return 'ontem'
    return format(d, 'dd/MM')
  }

  return (
    <Card className="w-full h-full flex overflow-hidden border-border rounded-xl shadow-sm">
      <div
        className={cn(
          'w-full md:w-[340px] flex-shrink-0 flex flex-col border-r bg-card',
          selectedConv ? 'hidden md:flex' : 'flex',
        )}
      >
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              className="pl-9 h-10 bg-secondary/50 border-transparent focus-visible:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingConvs ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 border-b">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : filteredConvs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search
                ? 'Nenhuma conversa encontrada.'
                : 'Nenhuma conversa ainda. Quando pacientes enviarem mensagens, elas aparecerao aqui.'}
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredConvs.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={cn(
                    'flex flex-col p-4 border-b cursor-pointer transition-colors hover:bg-secondary/50',
                    selectedConv?.id === conv.id ? 'bg-secondary' : '',
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm truncate pr-2">
                      {conv.patient?.full_name || conv.phone_number}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {conv.lastMessagePreview || 'Iniciou uma conversa'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.is_bot_active && <Bot className="h-3.5 w-3.5 text-primary/70" />}
                      {conv.unread_count > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-[10px]">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div
        className={cn(
          'flex-1 flex flex-col bg-[#F0F2F5] dark:bg-[#0b141a]',
          !selectedConv ? 'hidden md:flex' : 'flex',
        )}
      >
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-card">
            <div className="h-20 w-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Selecione uma conversa</h3>
            <p className="text-muted-foreground">
              Escolha uma conversa ao lado para comecar a responder.
            </p>
          </div>
        ) : (
          <>
            <div className="h-[68px] flex-shrink-0 flex items-center justify-between px-4 border-b bg-card">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -ml-2"
                  onClick={() => setSelectedConv(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center text-primary overflow-hidden">
                  {selectedConv.patient?.full_name ? (
                    <span className="font-semibold text-lg">
                      {selectedConv.patient.full_name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <UserIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex flex-col">
                  {selectedConv.patient_id ? (
                    <Link
                      to={`/crm/patients/${selectedConv.patient_id}`}
                      className="font-semibold text-[15px] hover:underline cursor-pointer"
                    >
                      {selectedConv.patient?.full_name || selectedConv.phone_number}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[15px]">{selectedConv.phone_number}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date().getTime() - new Date(selectedConv.last_message_at).getTime() <
                    300000
                      ? 'Online'
                      : selectedConv.phone_number}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={selectedConv.is_bot_active ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleBot}
                  className="hidden sm:flex h-9"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  {selectedConv.is_bot_active ? 'Assumir' : 'Devolver ao Bot'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleBot}
                  className="sm:hidden"
                  title={selectedConv.is_bot_active ? 'Assumir' : 'Devolver ao Bot'}
                >
                  <Bot
                    className={cn(
                      'h-5 w-5',
                      selectedConv.is_bot_active ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                </Button>
              </div>
            </div>

            <ScrollArea
              className="flex-1 p-4 md:p-6"
              style={{
                backgroundImage:
                  "url('https://static.whatsapp.net/env/whatsapp-web/images/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')",
                backgroundSize: 'initial',
                backgroundRepeat: 'repeat',
                opacity: 0.8,
              }}
            >
              {loadingMessages ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="flex flex-col gap-3 pb-4">
                  {messages.map((msg, i) => {
                    const showDate =
                      i === 0 ||
                      format(new Date(messages[i - 1].created_at), 'yyyy-MM-dd') !==
                        format(new Date(msg.created_at), 'yyyy-MM-dd')
                    const isOutbound = msg.direction === 'outbound'

                    return (
                      <div key={msg.id} className="flex flex-col">
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="bg-background/90 text-xs px-3 py-1 rounded-md shadow-sm border">
                              {isToday(new Date(msg.created_at))
                                ? 'Hoje'
                                : isYesterday(new Date(msg.created_at))
                                  ? 'Ontem'
                                  : format(new Date(msg.created_at), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            'flex w-full',
                            isOutbound ? 'justify-end' : 'justify-start',
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] sm:max-w-[75%] px-3 py-2 rounded-lg relative shadow-sm',
                              isOutbound
                                ? 'bg-[#005c4b] text-white rounded-tr-sm'
                                : 'bg-[#202c33] text-[#e9edef] rounded-tl-sm border border-border/5',
                            )}
                          >
                            <div className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">
                              {msg.content}
                            </div>
                            <div className="flex items-center justify-end gap-1.5 mt-1 -mb-1">
                              <span
                                className={cn(
                                  'text-[10px]',
                                  isOutbound ? 'text-white/70' : 'text-[#8696a0]',
                                )}
                              >
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                              {isOutbound && (
                                <span className="flex items-center">
                                  {msg.sender_type === 'bot' && (
                                    <Bot className="h-[11px] w-[11px] mr-1 text-white/70" />
                                  )}
                                  {msg.isOptimistic ? (
                                    <Check className="h-[14px] w-[14px] text-white/50" />
                                  ) : msg.isError ? (
                                    <AlertCircle className="h-[12px] w-[12px] text-red-400" />
                                  ) : msg.delivery_status === 'read' ? (
                                    <CheckCheck className="h-[14px] w-[14px] text-[#53bdeb]" />
                                  ) : msg.delivery_status === 'delivered' ? (
                                    <CheckCheck className="h-[14px] w-[14px] text-white/70" />
                                  ) : (
                                    <Check className="h-[14px] w-[14px] text-white/70" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="bg-card p-3 md:p-4 border-t flex items-end gap-3 min-h-[60px]">
              <textarea
                className="flex-1 bg-secondary border-none resize-none rounded-xl px-4 py-3 min-h-[44px] max-h-[120px] text-[15px] focus:outline-none focus:ring-0 overflow-y-auto custom-scrollbar"
                placeholder="Mensagem"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
              />
              <Button
                size="icon"
                className={cn(
                  'h-11 w-11 rounded-full flex-shrink-0 transition-all',
                  inputText.trim()
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
                onClick={sendMessage}
                disabled={!inputText.trim()}
              >
                <Send className="h-5 w-5 ml-1" />
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
