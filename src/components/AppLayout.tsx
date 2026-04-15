import { Suspense, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useTheme } from '@/hooks/use-theme'
import { useAuthContext } from '@/hooks/use-auth'
import { SidebarNav } from './SidebarNav'
import { LoadingScreen } from './LoadingScreen'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, Moon, Sun, Settings, LogOut } from 'lucide-react'

export default function AppLayout() {
  const { theme, setTheme } = useTheme()
  const { profile, signOut } = useAuthContext()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getInitials = (name?: string) => {
    if (!name) return 'DF'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'Administrador'
      case 'doctor':
        return 'Medico'
      case 'secretary':
        return 'Secretaria'
      default:
        return 'Usuario'
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-card flex items-center px-4 justify-between lg:px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden active:scale-95 transition-transform"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
              <SidebarNav onItemClick={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex flex-col leading-none select-none">
            <span className="text-primary font-bold text-[20px] tracking-tight">
              Doctor Funnels
            </span>
            <span className="text-accent font-medium text-[11px] tracking-[2px] mt-0.5">OS</span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="active:scale-95 transition-transform"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full active:scale-95 transition-transform"
              >
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.full_name || 'Usuário'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {getRoleLabel(profile?.role)}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuracoes</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1 pt-16">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-[260px] border-r bg-card flex-col z-40">
          <SidebarNav />
        </aside>

        {/* Content Area */}
        <main className="flex-1 lg:ml-[260px] w-full">
          <div className="max-w-[1280px] mx-auto p-4 md:p-6 min-h-[calc(100vh-4rem)]">
            <Suspense fallback={<LoadingScreen />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
