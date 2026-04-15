import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export default function Index() {
  const navigate = useNavigate()
  const { isAdmin, isAuthenticated, loading } = useAuthContext()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (isAdmin) {
          navigate('/admin', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [loading, isAuthenticated, isAdmin, navigate])

  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
