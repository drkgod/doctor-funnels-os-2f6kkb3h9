import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ModuleGate } from '@/components/ModuleGate'
import { useTenant } from '@/hooks/useTenant'
import { appointmentService, Appointment } from '@/services/appointmentService'
import { supabase } from '@/lib/supabase/client'
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DayView } from '@/components/agenda/DayView'
import { WeekView } from '@/components/agenda/WeekView'
import { MonthView } from '@/components/agenda/MonthView'
import { AppointmentDialog } from '@/components/agenda/AppointmentDialog'
import { AppointmentDrawer } from '@/components/agenda/AppointmentDrawer'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function Agenda() {
  const { tenant } = useTenant()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [view, setView] = useState<'day' | 'week' | 'month'>(() => {
    return (localStorage.getItem('df-agenda-view') as any) || 'week'
  })

  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [gcalEvents, setGcalEvents] = useState<any[]>([])
  const [gcalStatus, setGcalStatus] = useState<{ connected: boolean; email?: string } | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null)

  const [slotDate, setSlotDate] = useState<Date | null>(null)
  const [slotTime, setSlotTime] = useState<string | null>(null)

  const checkGcalStatus = async () => {
    const { data } = await supabase.functions.invoke('google-calendar-auth', {
      body: { action: 'check_status' },
    })
    if (data) setGcalStatus(data)
  }

  useEffect(() => {
    const gcal = searchParams.get('gcal')
    if (gcal === 'success') {
      const email = searchParams.get('email')
      toast({
        title: 'Sucesso',
        description: `Google Calendar conectado com sucesso! ${email || ''}`,
      })
      const url = new URL(window.location.href)
      url.searchParams.delete('gcal')
      url.searchParams.delete('email')
      window.history.replaceState({}, '', url.toString())
    } else if (gcal === 'error') {
      const reason = searchParams.get('reason')
      let msg = 'Erro ao conectar. Tente novamente.'
      if (reason === 'missing_code') msg = 'Autorizacao cancelada. Tente novamente.'
      if (reason === 'invalid_state') msg = 'Erro de validacao. Tente novamente.'
      if (reason === 'server_error') msg = 'Erro interno. Tente novamente.'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
      const url = new URL(window.location.href)
      url.searchParams.delete('gcal')
      url.searchParams.delete('reason')
      window.history.replaceState({}, '', url.toString())
    }

    checkGcalStatus()
  }, [searchParams])

  const loadData = async () => {
    if (!tenant?.id) return
    setLoading(true)
    setError(false)
    try {
      let from, to
      if (view === 'day') {
        from = startOfDay(currentDate).toISOString()
        to = endOfDay(currentDate).toISOString()
      } else if (view === 'week') {
        from = startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString()
        to = endOfWeek(currentDate, { weekStartsOn: 1 }).toISOString()
      } else {
        from = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }).toISOString()
        to = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }).toISOString()
      }

      const data = await appointmentService.fetchAppointments(tenant.id, from, to)
      setAppointments(data)

      if (gcalStatus?.connected) {
        const { data: gData, error: gError } = await supabase.functions.invoke(
          'google-calendar-sync',
          {
            body: { action: 'list_events', timeMin: from, timeMax: to },
          },
        )
        if (gData && !gError) {
          setGcalEvents(gData)
        }
      }
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [tenant?.id, currentDate, view, gcalStatus?.connected])

  useEffect(() => {
    localStorage.setItem('df-agenda-view', view)
  }, [view])

  useEffect(() => {
    const pid = searchParams.get('patient_id')
    const act = searchParams.get('action')
    if (pid || act === 'new') {
      setDialogOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!tenant?.id) return
    const channel = supabase
      .channel('agenda-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          loadData()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenant?.id, currentDate, view])

  const handlePrev = () => {
    if (view === 'day') setCurrentDate(subDays(currentDate, 1))
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNext = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1))
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addMonths(currentDate, 1))
  }

  const handleToday = () => setCurrentDate(new Date())

  const getHeaderTitle = () => {
    if (view === 'day') return format(currentDate, "dd 'de' MMMM", { locale: ptBR })
    if (view === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 })
      const e = endOfWeek(currentDate, { weekStartsOn: 1 })
      if (s.getMonth() === e.getMonth())
        return `${format(s, 'dd')} - ${format(e, "dd 'de' MMMM", { locale: ptBR })}`
      return `${format(s, "dd 'de' MMM", { locale: ptBR })} - ${format(e, "dd 'de' MMM", { locale: ptBR })}`
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
  }

  const handleSlotClick = (date: Date, time?: string) => {
    setSlotDate(date)
    setSlotTime(time || null)
    setSelectedApp(null)
    setDialogOpen(true)
  }

  const handleAppClick = (app: Appointment) => {
    setSelectedApp(app)
    setDrawerOpen(true)
  }

  const handleConnectGcal = async () => {
    const { data } = await supabase.functions.invoke('google-calendar-auth', {
      body: { action: 'get_auth_url' },
    })
    if (data?.auth_url) {
      window.location.href = data.auth_url
    } else {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel iniciar conexao com Google Calendar.',
        variant: 'destructive',
      })
    }
  }

  const handleDisconnectGcal = async () => {
    if (!confirm('Tem certeza? A sincronizacao com Google Calendar sera desativada.')) return
    const { data } = await supabase.functions.invoke('google-calendar-auth', {
      body: { action: 'disconnect' },
    })
    if (data?.success) {
      toast({ title: 'Sucesso', description: 'Google Calendar desconectado.' })
      setGcalStatus({ connected: false })
      setGcalEvents([])
    } else {
      toast({ title: 'Erro', description: 'Nao foi possivel desconectar.', variant: 'destructive' })
    }
  }

  const handleSaveAppointment = async (data: any) => {
    if (!tenant?.id) return
    let savedApp

    if (selectedApp) {
      savedApp = await appointmentService.updateAppointment(selectedApp.id, data)
      toast({ title: 'Sucesso', description: 'Agendamento atualizado com sucesso.' })

      if (selectedApp.google_event_id && gcalStatus?.connected) {
        await supabase.functions.invoke('google-calendar-sync', {
          body: {
            action: 'update_event',
            event_id: selectedApp.google_event_id,
            event_data: {
              summary: `Consulta - ${data.patient_name || selectedApp.patient_name}`,
              start_datetime: data.datetime_start,
              end_datetime: data.datetime_end,
              description: data.notes,
            },
          },
        })
      }
    } else {
      savedApp = await appointmentService.createAppointment(tenant.id, data)
      toast({ title: 'Sucesso', description: 'Agendamento criado com sucesso.' })

      if (gcalStatus?.connected) {
        const { data: patient } = await supabase
          .from('patients')
          .select('full_name')
          .eq('id', data.patient_id)
          .single()
        const patientName = patient?.full_name || 'Paciente'

        const { data: syncRes } = await supabase.functions.invoke('google-calendar-sync', {
          body: {
            action: 'create_event',
            event_data: {
              summary: `Consulta - ${patientName}`,
              start_datetime: data.datetime_start,
              end_datetime: data.datetime_end,
              description: data.notes,
            },
          },
        })

        if (syncRes && syncRes.id) {
          await appointmentService.updateAppointment(savedApp.id, { google_event_id: syncRes.id })
        } else {
          toast({
            title: 'Aviso',
            description:
              'Agendamento criado, mas nao foi possivel sincronizar com Google Calendar.',
            variant: 'destructive',
          })
        }
      }
    }
    loadData()
  }

  const allAppointments = [...appointments]
  if (gcalEvents && gcalEvents.length > 0) {
    const localGcalIds = new Set(appointments.map((a) => a.google_event_id).filter(Boolean))
    gcalEvents.forEach((evt) => {
      if (!localGcalIds.has(evt.id) && evt.start?.dateTime && evt.end?.dateTime) {
        allAppointments.push({
          id: evt.id,
          tenant_id: tenant?.id || '',
          patient_id: 'gcal_ghost',
          doctor_id: null,
          datetime_start: evt.start.dateTime,
          datetime_end: evt.end.dateTime,
          type: 'google_calendar',
          status: 'confirmed',
          google_event_id: evt.id,
          notes: evt.description || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patient_name: evt.summary || 'Evento Google Calendar',
        })
      }
    })
  }

  if (error) {
    return (
      <ModuleGate moduleKey="agenda">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-destructive mb-4 font-medium">
            Não foi possível carregar a agenda. Tente novamente.
          </p>
          <Button onClick={loadData}>Tentar novamente</Button>
        </div>
      </ModuleGate>
    )
  }

  return (
    <ModuleGate moduleKey="agenda">
      <div className="flex flex-col h-[calc(100vh-100px)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <div className="flex border border-border rounded-md overflow-hidden">
              {['day', 'week', 'month'].map((v) => (
                <button
                  key={v}
                  className={cn(
                    'px-[14px] py-2 text-[13px] transition-colors',
                    view === v
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary',
                  )}
                  onClick={() => setView(v as any)}
                >
                  {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
            <Button variant="outline" className="h-9 text-[13px] px-[14px]" onClick={handleToday}>
              Hoje
            </Button>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3">
            {gcalStatus !== null && (
              <div className="hidden md:flex items-center mr-2">
                {!gcalStatus.connected ? (
                  <Button
                    variant="outline"
                    className="h-9 px-3 gap-2 text-[13px]"
                    onClick={handleConnectGcal}
                  >
                    <CalendarDays className="w-4 h-4" />
                    Conectar Google Calendar
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 bg-secondary/30 border border-border rounded-md px-3 h-9">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-success text-[13px] font-medium">
                        Calendar conectado
                      </span>
                      <span className="text-muted-foreground text-[12px] truncate max-w-[120px]">
                        {gcalStatus.email}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-6 w-6 p-0">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => loadData()}>
                          Sincronizar agora
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={handleDisconnectGcal}
                        >
                          Desconectar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="h-9 w-9 rounded-md p-0 hover:bg-secondary"
                onClick={handlePrev}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-[15px] font-semibold cursor-pointer hover:text-primary transition-colors select-none text-center min-w-[140px]">
                {getHeaderTitle()}
              </span>
              <Button
                variant="ghost"
                className="h-9 w-9 rounded-md p-0 hover:bg-secondary"
                onClick={handleNext}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Button
              className="h-10 font-semibold px-4"
              onClick={() => {
                setSlotDate(new Date())
                setSlotTime(null)
                setSelectedApp(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> <span>Novo Agendamento</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="w-full h-full flex gap-6">
              <Skeleton className="flex-1 rounded-md" />
              {view === 'day' && <Skeleton className="w-[300px] hidden lg:block rounded-md" />}
            </div>
          ) : (
            <>
              {view === 'day' && (
                <DayView
                  currentDate={currentDate}
                  appointments={allAppointments}
                  onSlotClick={(time) => handleSlotClick(currentDate, time)}
                  onAppointmentClick={handleAppClick}
                  onNewAppointment={() => {
                    setSlotDate(currentDate)
                    setSlotTime(null)
                    setSelectedApp(null)
                    setDialogOpen(true)
                  }}
                />
              )}
              {view === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  appointments={allAppointments}
                  onSlotClick={handleSlotClick}
                  onAppointmentClick={handleAppClick}
                />
              )}
              {view === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  appointments={allAppointments}
                  onDayClick={(date) => {
                    setCurrentDate(date)
                    setView('day')
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {dialogOpen && tenant?.id && (
        <AppointmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialDate={slotDate}
          initialTime={slotTime}
          initialPatientId={searchParams.get('patient_id')}
          tenantId={tenant.id}
          onSave={handleSaveAppointment}
          appointment={selectedApp}
        />
      )}

      {drawerOpen && selectedApp && (
        <AppointmentDrawer
          appointment={selectedApp}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onEdit={() => {
            setDrawerOpen(false)
            setTimeout(() => setDialogOpen(true), 150)
          }}
          onConfirm={async () => {
            await appointmentService.updateAppointment(selectedApp.id, { status: 'confirmed' })
            toast({ title: 'Sucesso', description: 'Confirmado com sucesso.' })
            loadData()
            setDrawerOpen(false)
          }}
          onComplete={async () => {
            await appointmentService.completeAppointment(selectedApp.id)
            toast({ title: 'Sucesso', description: 'Concluído com sucesso.' })
            loadData()
            setDrawerOpen(false)
          }}
          onNoShow={async () => {
            await appointmentService.markNoShow(selectedApp.id)
            toast({ title: 'Sucesso', description: 'No-show registrado com sucesso.' })
            loadData()
            setDrawerOpen(false)
          }}
          onCancel={async () => {
            await appointmentService.cancelAppointment(selectedApp.id)
            if (selectedApp.google_event_id && gcalStatus?.connected) {
              await supabase.functions.invoke('google-calendar-sync', {
                body: { action: 'delete_event', event_id: selectedApp.google_event_id },
              })
            }
            toast({ title: 'Sucesso', description: 'Cancelado com sucesso.' })
            loadData()
            setDrawerOpen(false)
          }}
        />
      )}
    </ModuleGate>
  )
}
