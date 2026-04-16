import { useState, useEffect } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function GoogleCalendarConnect() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connectedEmail, setConnectedEmail] = useState('')
  const [connectedAt, setConnectedAt] = useState('')
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  useEffect(() => {
    checkStatus()

    const gcal = searchParams.get('gcal')
    const emailParam = searchParams.get('email')
    const reason = searchParams.get('reason')

    if (gcal === 'success') {
      toast({
        variant: 'default',
        description: `Google Calendar conectado com sucesso! ${emailParam || ''}`,
      })
      window.history.replaceState({}, '', window.location.pathname)
      checkStatus()
    } else if (gcal === 'error') {
      let errorMsg = 'Erro ao conectar. Tente novamente.'
      if (reason === 'missing_code') errorMsg = 'Autorizacao cancelada. Tente novamente.'
      if (reason === 'invalid_state') errorMsg = 'Erro de validacao. Tente novamente.'
      if (reason === 'token_exchange_failed') errorMsg = 'Erro ao conectar. Tente novamente.'
      if (reason === 'server_error') errorMsg = 'Erro interno. Tente novamente.'
      toast({ variant: 'destructive', description: errorMsg })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  const checkStatus = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'check_status' },
      })
      if (error) throw error
      if (data?.connected) {
        setConnected(true)
        setConnectedEmail(data.email)
        setConnectedAt(data.connected_at)
      } else {
        setConnected(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url' },
      })
      if (error) throw error
      if (data?.auth_url) {
        window.location.href = data.auth_url
      }
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao iniciar conexao.' })
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'disconnect' },
      })
      if (error) throw error
      setConnected(false)
      setConnectedEmail('')
      toast({ description: 'Google Calendar desconectado.' })
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao desconectar.' })
    } finally {
      setLoading(false)
      setDisconnectDialogOpen(false)
    }
  }

  const handleSyncNow = async () => {
    try {
      const date = new Date()
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()

      const { error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'list_events', timeMin: startOfMonth, timeMax: endOfMonth },
      })
      if (error) throw error
      toast({ description: 'Calendario sincronizado' })
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao sincronizar calendário.' })
    }
  }

  if (loading) return <Skeleton className="w-[200px] h-[36px]" />

  if (!connected) {
    return (
      <Button variant="outline" className="h-[36px] text-[13px] gap-2" onClick={handleConnect}>
        <CalendarDays className="h-4 w-4" />
        Conectar Google Calendar
      </Button>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[hsl(152,68%,40%)]" />
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[13px] font-medium text-[hsl(152,68%,40%)]">
            Calendar conectado
          </span>
          <span className="text-[12px] text-muted-foreground">{connectedEmail}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSyncNow}>Sincronizar agora</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDisconnectDialogOpen(true)}
            >
              Desconectar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Google Calendar</AlertDialogTitle>
            <AlertDialogDescription>
              A sincronizacao com Google Calendar sera desativada. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
