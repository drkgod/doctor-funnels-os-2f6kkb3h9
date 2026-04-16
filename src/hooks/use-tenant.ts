import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthContext } from '@/hooks/use-auth'

export function useTenant() {
  const auth = useAuthContext() as any
  const [tenant, setTenant] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchTenant() {
      const { data: authData } = await supabase.auth.getUser()
      const currentUserId = auth?.user?.id || authData?.user?.id

      if (!currentUserId) {
        if (mounted) setLoading(false)
        return
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', currentUserId)
          .single()

        if (profile?.tenant_id) {
          const [tenantRes, modulesRes] = await Promise.all([
            supabase.from('tenants').select('*').eq('id', profile.tenant_id).single(),
            supabase.from('tenant_modules').select('*').eq('tenant_id', profile.tenant_id),
          ])

          if (mounted) {
            if (tenantRes.data) setTenant(tenantRes.data)
            if (modulesRes.data) setModules(modulesRes.data)
          }
        }
      } catch (error) {
        console.error('Error fetching tenant modules', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchTenant()

    return () => {
      mounted = false
    }
  }, [auth?.user?.id])

  const isModuleEnabled = useCallback(
    (moduleKey: string) => {
      const mod = modules.find((m) => m.module_key === moduleKey)
      return mod?.is_enabled ?? false
    },
    [modules],
  )

  return { tenant, modules, loading, isModuleEnabled }
}
