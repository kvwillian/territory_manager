import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { useAccount } from '../auth'
import { auth } from '../firebase'
import { useMeetings } from '../store'
import { ThemeToggle } from '../theme'

const items = [
  { to: '/inicio', label: 'Início', icon: Home },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  {
    to: '/designacoes/reunioes',
    label: 'Designações',
    icon: ClipboardList,
    children: [
      { to: '/designacoes/reunioes', label: 'Reuniões' },
      { to: '/designacoes/audio-video', label: 'Áudio e Vídeo' },
      { to: '/designacoes/idosos', label: 'Suporte a Idosos' },
      { to: '/designacoes/limpeza', label: 'Limpeza' },
      { to: '/designacoes/habilitacoes', label: 'Habilitações' },
    ],
  },
  { to: '/publicadores', label: 'Publicadores', icon: Users },
  { to: '/territorios', label: 'Territórios', icon: Map },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

function crumbsFor(pathname: string) {
  if (pathname.startsWith('/designacoes/audio-video')) return ['Designações', 'Áudio e Vídeo']
  if (pathname.startsWith('/designacoes/idosos')) return ['Designações', 'Suporte a Idosos']
  if (pathname.startsWith('/designacoes/limpeza')) return ['Designações', 'Limpeza']
  if (pathname.startsWith('/designacoes/habilitacoes')) return ['Designações', 'Funções e habilitações']
  if (pathname.startsWith('/designacoes')) return ['Designações', 'Reuniões']
  if (pathname.startsWith('/agenda')) return ['Agenda']
  if (pathname.startsWith('/publicadores/grupos')) return ['Publicadores', 'Grupos']
  if (pathname.startsWith('/publicadores/estatisticas')) return ['Publicadores', 'Estatísticas']
  if (pathname.startsWith('/publicadores')) return ['Publicadores', 'Lista']
  if (pathname.startsWith('/territorios/lista')) return ['Territórios', 'Territórios']
  if (pathname.startsWith('/territorios/locais')) return ['Territórios', 'Locais de saída']
  if (pathname.startsWith('/territorios/historico')) return ['Territórios', 'Histórico']
  if (pathname.startsWith('/territorios')) return ['Territórios', 'Designações']
  if (pathname.startsWith('/relatorios')) return ['Relatórios']
  if (pathname.startsWith('/configuracoes')) return ['Configurações']
  return ['Início']
}

export function AppShell() {
  const location = useLocation()
  const { query, setQuery, sidebarCollapsed, toggleSidebar, congregation } = useMeetings()
  const account = useAccount()
  const [noticesOpen, setNoticesOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const crumbs = crumbsFor(location.pathname)
  const designationsOpen = location.pathname.startsWith('/designacoes')

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileNavOpen && !noticesOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileNavOpen(false)
        setNoticesOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileNavOpen, noticesOpen])

  return (
    <div className="flex h-full min-h-screen bg-canvas text-ink">
      {/* Desktop persistent sidebar (lg+) */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-line bg-white lg:flex ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[248px]'
        }`}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          congregation={congregation}
          designationsOpen={designationsOpen}
          pathname={location.pathname}
          account={account}
        />
      </aside>

      {/* Mobile & Tablet slide-over drawer (< lg) */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu principal">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[264px] max-w-[85vw] flex-col border-r border-line bg-white shadow-xl">
            <SidebarContent
              collapsed={false}
              congregation={congregation}
              designationsOpen={designationsOpen}
              pathname={location.pathname}
              account={account}
              onClose={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-white px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB] lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={18} />
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB] lg:grid"
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm text-muted" aria-label="Trilha">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1
              return (
                <span
                  key={crumb}
                  className={isLast ? 'flex min-w-0 items-center gap-1.5' : 'hidden shrink-0 items-center gap-1.5 sm:flex'}
                >
                  {index > 0 ? <ChevronRight size={14} className="hidden shrink-0 sm:inline" /> : null}
                  <span className={isLast ? 'truncate font-medium text-ink' : ''}>{crumb}</span>
                </span>
              )
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <label className="relative hidden md:block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..."
                className="h-9 w-44 rounded-full border border-transparent bg-[#F3F5FB] pl-9 pr-3 text-sm outline-none placeholder:text-[#94A3B8] focus:border-indigo lg:h-10 lg:w-56"
                aria-label="Buscar designações"
              />
            </label>
            <ThemeToggle className="h-9 w-9 sm:h-10 sm:w-10" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setNoticesOpen((open) => !open)}
                className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted hover:bg-[#F8FAFC] sm:h-10 sm:w-10"
                aria-label="Notificações"
              >
                <Bell size={16} />
              </button>
              {noticesOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-line bg-white p-3 text-sm text-muted shadow-sm">
                  Nenhuma notificação nova.
                </div>
              ) : null}
            </div>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo sm:h-10 sm:w-10">
              {initials(account?.name ?? '')}
            </span>
          </div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  collapsed,
  congregation,
  designationsOpen,
  pathname,
  account,
  onClose,
}: {
  collapsed: boolean
  congregation: { name: string; place?: string }
  designationsOpen: boolean
  pathname: string
  account: ReturnType<typeof useAccount>
  onClose?: () => void
}) {
  return (
    <>
      <div className={`flex items-center gap-2.5 px-4 py-4 ${collapsed ? 'justify-center' : ''}`}>
        <img src="/logo.jpeg" alt="Unio" className="h-9 w-9 shrink-0 rounded-xl" />
        {collapsed ? null : <span className="text-lg font-semibold tracking-tight">Unio</span>}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      {collapsed ? null : (
        <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-soft text-indigo">
            <Building2 size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{congregation.name}</span>
            {congregation.place ? <span className="block truncate text-xs text-muted">{congregation.place}</span> : null}
          </span>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const Icon = item.icon
          const childActive = item.children?.some((child) => pathname === child.to)
          if (item.children) {
            return (
              <div key={item.label}>
                <NavLink
                  to={item.to}
                  title={item.label}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    designationsOpen ? 'bg-[#F3F5FB] text-ink' : 'text-[#334155] hover:bg-[#F8FAFC]'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon size={18} className={designationsOpen ? 'text-indigo' : 'text-muted'} />
                  {collapsed ? null : item.label}
                </NavLink>
                {collapsed || !designationsOpen ? null : (
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-line pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `block rounded-lg px-2 py-2 text-sm ${
                            isActive
                              ? 'border-l-2 border-indigo bg-white font-medium text-indigo'
                              : 'text-[#475569] hover:text-ink'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive && !childActive ? 'bg-[#F3F5FB] text-ink' : 'text-[#334155] hover:bg-[#F8FAFC]'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon size={18} className="text-muted" />
              {collapsed ? null : item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className={`border-t border-line p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-2.5 ${collapsed ? '' : 'px-1'}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
            {initials(account?.name ?? '')}
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{account?.name}</span>
                <span className="block text-xs text-muted">
                  {account?.role === 'admin' ? 'Administrador' : 'Condutor'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void signOut(auth)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
                aria-label="Sair"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
