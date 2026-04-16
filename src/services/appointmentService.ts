import { supabase } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'

export const appointmentService = {
  async syncAppointmentToGoogleCalendar(
    tenantId: string,
    appointmentData: {
      patient_name: string
      datetime_start: string
      datetime_end: string
      notes?: string
      appointmentId: string
    },
  ) {
    try {
      const { data: statusData, error: statusError } = await supabase.functions.invoke(
        'google-calendar-auth',
        {
          body: { action: 'check_status' },
        },
      )

      if (statusError || !statusData?.connected) {
        return // Silent return if not connected
      }

      const { data: syncData, error: syncError } = await supabase.functions.invoke(
        'google-calendar-sync',
        {
          body: {
            action: 'create_event',
            event_data: {
              summary: `Consulta - ${appointmentData.patient_name}`,
              start_datetime: appointmentData.datetime_start,
              end_datetime: appointmentData.datetime_end,
              description: appointmentData.notes || '',
            },
          },
        },
      )

      if (syncError || !syncData?.id) {
        toast({
          variant: 'destructive',
          description: 'Agendamento criado, mas nao foi possivel sincronizar com Google Calendar.',
        })
        return
      }

      // Update appointment with google_event_id
      await supabase
        .from('appointments')
        .update({ google_event_id: syncData.id })
        .eq('id', appointmentData.appointmentId)
    } catch (e) {
      toast({
        variant: 'destructive',
        description: 'Agendamento criado, mas nao foi possivel sincronizar com Google Calendar.',
      })
    }
  },

  async updateGoogleCalendarEvent(googleEventId: string, eventData: any) {
    try {
      const { data: statusData, error: statusError } = await supabase.functions.invoke(
        'google-calendar-auth',
        {
          body: { action: 'check_status' },
        },
      )

      if (statusError || !statusData?.connected) return

      const { error: syncError } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'update_event', event_id: googleEventId, event_data: eventData },
      })

      if (syncError) {
        toast({
          variant: 'destructive',
          description:
            'Agendamento atualizado, mas nao foi possivel sincronizar com Google Calendar.',
        })
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        description:
          'Agendamento atualizado, mas nao foi possivel sincronizar com Google Calendar.',
      })
    }
  },

  async deleteGoogleCalendarEvent(googleEventId: string) {
    try {
      const { data: statusData, error: statusError } = await supabase.functions.invoke(
        'google-calendar-auth',
        {
          body: { action: 'check_status' },
        },
      )

      if (statusError || !statusData?.connected) return

      const { error: syncError } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'delete_event', event_id: googleEventId },
      })

      if (syncError) {
        toast({
          variant: 'destructive',
          description: 'Agendamento removido, mas nao foi possivel remover do Google Calendar.',
        })
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        description: 'Agendamento removido, mas nao foi possivel remover do Google Calendar.',
      })
    }
  },
}
