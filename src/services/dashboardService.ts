import { supabase } from '@/lib/supabase/client'
import {
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface DateRange {
  from: string
  to: string
}

export async function fetchDashboardStats(tenantId: string, dateRange: DateRange) {
  return getStats(tenantId, dateRange)
}

export async function fetchDoctorStats(tenantId: string, doctorId: string, dateRange: DateRange) {
  return getStats(tenantId, dateRange, doctorId)
}

async function getStats(tenantId: string, dateRange: DateRange, doctorId?: string) {
  const { from, to } = dateRange
  const now = new Date()
  const sevenDaysAgo = subDays(startOfDay(now), 6)
  const endOfToday = endOfDay(now)
  const sixMonthsAgo = startOfMonth(subMonths(now, 5))
  const endOfThisMonth = endOfMonth(now)
  const nextSevenDays = endOfDay(addDays(now, 7))

  const query = (table: string, countOnly = true) =>
    supabase
      .from(table)
      .select(countOnly ? 'id' : '*', { count: countOnly ? 'exact' : null, head: countOnly })
      .eq('tenant_id', tenantId)

  const patientQ = () =>
    doctorId ? query('patients').eq('assigned_to', doctorId) : query('patients')
  const apptQ = () =>
    doctorId ? query('appointments').eq('doctor_id', doctorId) : query('appointments')
  const recordQ = () =>
    doctorId ? query('medical_records').eq('doctor_id', doctorId) : query('medical_records')

  const txQ = () => {
    if (doctorId) {
      return supabase
        .from('transcriptions')
        .select('id, medical_records!inner(doctor_id)', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('medical_records.doctor_id', doctorId)
    }
    return query('transcriptions')
  }

  const [
    { count: total_patients },
    { count: new_patients },
    { count: total_appointments },
    { count: completed_appointments },
    { count: no_show_appointments },
    { count: total_records },
    { count: signed_records },
    { count: total_transcriptions },
    { data: upcomingData },
    { data: recentData },
    { data: dailyApptsData },
    { data: monthlyPatientsData },
    { count: basePatientsCount },
  ] = await Promise.all([
    patientQ(),
    patientQ().gte('created_at', from).lte('created_at', to),
    apptQ().gte('datetime_start', from).lte('datetime_start', to),
    apptQ().gte('datetime_start', from).lte('datetime_start', to).eq('status', 'completed'),
    apptQ().gte('datetime_start', from).lte('datetime_start', to).eq('status', 'no_show'),
    recordQ().gte('created_at', from).lte('created_at', to),
    recordQ().gte('created_at', from).lte('created_at', to).eq('status', 'signed'),
    txQ().gte('created_at', from).lte('created_at', to).eq('status', 'completed'),
    supabase
      .from('appointments')
      .select('id, datetime_start, type, status, patient_id, patients!inner(full_name)')
      .eq('tenant_id', tenantId)
      .gte('datetime_start', now.toISOString())
      .lte('datetime_start', nextSevenDays.toISOString())
      .neq('status', 'cancelled')
      .order('datetime_start', { ascending: true })
      .limit(10)
      .match(doctorId ? { doctor_id: doctorId } : {}),
    supabase
      .from('medical_records')
      .select('id, record_type, status, updated_at, patient_id, patients!inner(full_name)')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(5)
      .match(doctorId ? { doctor_id: doctorId } : {}),
    supabase
      .from('appointments')
      .select('datetime_start')
      .eq('tenant_id', tenantId)
      .gte('datetime_start', sevenDaysAgo.toISOString())
      .lte('datetime_start', endOfToday.toISOString())
      .match(doctorId ? { doctor_id: doctorId } : {}),
    supabase
      .from('patients')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', sixMonthsAgo.toISOString())
      .lte('created_at', endOfThisMonth.toISOString())
      .match(doctorId ? { assigned_to: doctorId } : {}),
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .lt('created_at', sixMonthsAgo.toISOString())
      .match(doctorId ? { assigned_to: doctorId } : {}),
  ])

  const upcoming_appointments = (upcomingData || []).map((a) => ({
    id: a.id,
    datetime_start: a.datetime_start,
    type: a.type,
    status: a.status,
    patient_name: (a.patients as any)?.full_name || 'Desconhecido',
  }))

  const recent_records = (recentData || []).map((r) => ({
    id: r.id,
    record_type: r.record_type,
    status: r.status,
    updated_at: r.updated_at,
    patient_name: (r.patients as any)?.full_name || 'Desconhecido',
  }))

  const days = eachDayOfInterval({ start: sevenDaysAgo, end: endOfToday })
  const daily_appointments = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const count = (dailyApptsData || []).filter(
      (a) => format(new Date(a.datetime_start), 'yyyy-MM-dd') === dayStr,
    ).length
    return {
      date: format(day, 'EEE', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase()),
      count,
    }
  })

  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: endOfThisMonth })
  let currentCumulative = basePatientsCount || 0
  const monthly_patients = months.map((month) => {
    const monthStr = format(month, 'yyyy-MM')
    const countInMonth = (monthlyPatientsData || []).filter(
      (p) => format(new Date(p.created_at), 'yyyy-MM') === monthStr,
    ).length
    currentCumulative += countInMonth
    return {
      month: format(month, 'MMM', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase()),
      count: currentCumulative,
    }
  })

  return {
    total_patients: total_patients || 0,
    new_patients: new_patients || 0,
    total_appointments: total_appointments || 0,
    completed_appointments: completed_appointments || 0,
    no_show_appointments: no_show_appointments || 0,
    total_records: total_records || 0,
    signed_records: signed_records || 0,
    total_transcriptions: total_transcriptions || 0,
    upcoming_appointments,
    recent_records,
    daily_appointments,
    monthly_patients,
  }
}
