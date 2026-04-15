import { useState, useEffect } from 'react'
import { ModuleGate } from '@/components/ModuleGate'
import { GenericPage } from '@/components/GenericPage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { emailService } from '@/services/emailService'
import { supabase } from '@/lib/supabase/client'
import { TemplatesTab } from './email/TemplatesTab'
import { CampaignsTab } from './email/CampaignsTab'

export default function Email() {
  const { user } = useAuth()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [usage, setUsage] = useState({ sent: 0, limit: 1000 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const init = async () => {
      try {
        setLoading(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id)

          const [usageData, moduleData] = await Promise.all([
            emailService.fetchEmailUsage(profile.tenant_id),
            supabase
              .from('tenant_modules')
              .select('limits')
              .eq('tenant_id', profile.tenant_id)
              .eq('module_key', 'email')
              .single(),
          ])

          const sent = usageData?.emails_sent || 0
          const limitParams = moduleData.data?.limits as any
          const limit = limitParams?.max_emails_month || 1000

          setUsage({ sent, limit })
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user])

  const usagePercent = (usage.sent / usage.limit) * 100
  const isHighUsage = usagePercent >= 80
  const isLimitReached = usagePercent >= 100
  const usageColor = isLimitReached
    ? 'text-destructive'
    : isHighUsage
      ? 'text-amber-500'
      : 'text-muted-foreground'

  const UsageIndicator = () => (
    <div className={`text-sm font-medium ${usageColor}`}>
      {usage.sent} / {usage.limit} emails este mês
    </div>
  )

  return (
    <ModuleGate moduleKey="email">
      <GenericPage
        title="Email"
        subtitle="Campanhas e comunicações transacionais"
        action={<UsageIndicator />}
      >
        <Tabs defaultValue="templates" className="w-full mt-6">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="mt-6">
            <TemplatesTab tenantId={tenantId!} loading={loading} error={error} />
          </TabsContent>
          <TabsContent value="campanhas" className="mt-6">
            <CampaignsTab
              tenantId={tenantId!}
              loading={loading}
              error={error}
              onUsageUpdate={() => {
                if (tenantId)
                  emailService
                    .fetchEmailUsage(tenantId)
                    .then((d) =>
                      setUsage((prev) => ({ ...prev, sent: d?.emails_sent || prev.sent })),
                    )
              }}
            />
          </TabsContent>
        </Tabs>
      </GenericPage>
    </ModuleGate>
  )
}
