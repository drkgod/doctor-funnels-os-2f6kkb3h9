import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthContext } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

export type AppNotification = {
  id: string
  tenant_id: string
  user_id: string | null
  title: string
  message: string
  type: string
  reference_id: string | null
  reference_type: string | null
  read: boolean
  created_at: string
}

export function useNotifications() {
  const { profile } = useAuthContext()
  const { toast } = useToast()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!profile?.tenant_id || !profile?.id) return

    const tenantId = profile.tenant_id
    const userId = profile.id

    const fetchNotifications = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.read).length)
      }
      setIsLoading(false)
    }

    fetchNotifications()

    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification
          if (newNotif.user_id === userId || newNotif.user_id === null) {
            setNotifications((prev) => [newNotif, ...prev])
            setUnreadCount((prev) => prev + 1)

            toast({ title: newNotif.title, description: newNotif.message })

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotif.title, { body: newNotif.message })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.tenant_id, profile?.id, toast])

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

    setUnreadCount((prev) => {
      const isUnread = notifications.find((n) => n.id === id)?.read === false
      return isUnread ? Math.max(0, prev - 1) : prev
    })

    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  const markAllAsRead = async () => {
    if (!profile?.tenant_id || !profile?.id) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('tenant_id', profile.tenant_id)
      .or(`user_id.eq.${profile.id},user_id.is.null`)
      .eq('read', false)
  }

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const item = notifications.find((n) => n.id === id)
    if (item && !item.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    await supabase.from('notifications').delete().eq('id', id)
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
