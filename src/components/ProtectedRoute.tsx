import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthContext } from '@/hooks/use-auth'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useEffect } from 'react'

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthContext()
  const location = useLocation()

  if (loading && !isAuthenticated) {
    return (
      <div className="flex flex-col h-screen w-full bg-background p-6 gap-6">
        <div className="flex gap-4">
          <Skeleton className="h-12 w-[260px] rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-lg" />
        </div>
        <div className="flex flex-1 gap-6">
          <Skeleton className="w-[260px] h-full rounded-lg" />
          <Skeleton className="flex-1 h-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !loading) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function AdminRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading, profile } = useAuthContext()
  const location = useLocation()

  useEffect(() => {
    if (!loading && isAuthenticated && profile && !isAdmin) {
      toast.error('Acesso restrito ao administrador.')
    }
  }, [loading, isAuthenticated, isAdmin, profile])

  if (loading && (!isAuthenticated || profile === null)) {
    return (
      <div className="flex flex-col h-screen w-full bg-background p-6 gap-6">
        <div className="flex gap-4">
          <Skeleton className="h-12 w-[260px] rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-lg" />
        </div>
        <div className="flex flex-1 gap-6">
          <Skeleton className="w-[260px] h-full rounded-lg" />
          <Skeleton className="flex-1 h-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !loading) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isAuthenticated && !isAdmin && (profile !== null || !loading)) {
    return <Navigate to="/dashboard" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
