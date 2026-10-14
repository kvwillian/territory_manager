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
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { useAccount } from '../auth'
import { auth } from '../firebase'
import { useMeetings } from '../store'

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
  if (pathname.startsWith('/designacoes')) return ['Designações', 'Reuniões']
  if (pathname.startsWith('/agenda')) return ['Agenda']
  if (pathname.startsWith('/publicadores')) return ['Publicadores']
  if (pathname.startsWith('/territorios')) return ['Territórios']
  if (pathname.startsWith('/relatorios')) return ['Relatórios']
  if (pathname.startsWith('/configuracoes')) return ['Configurações']
  return ['Início']
}

export function AppShell() {
  const location = useLocation()
  const { query, setQuery, sidebarCollapsed, toggleSidebar } = useMeetings()
  const account = useAccount()
  const [noticesOpen, setNoticesOpen] = useState(false)
  const crumbs = crumbsFor(location.pathname)
  const designationsOpen = location.pathname.startsWith('/designacoes')

  return (
    <div className="flex h-full min-h-screen bg-canvas text-ink">
      <aside
        className={`flex shrink-0 flex-col border-r border-line bg-white ${sidebarCollapsed ? 'w-[76px]' : 'w-[248px]'}`}
      >
        <div className={`flex items-center gap-2.5 px-4 py-4 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo text-sm font-semibold text-white">
            U
          </span>
          {sidebarCollapsed ? null : <span className="text-lg font-semibold tracking-tight">Unio</span>}
        </div>

        {sidebarCollapsed ? null : (
          <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl px-2 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-soft text-indigo">
              <Building2 size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">Congregação Central</span>
              <span className="block text-xs text-muted">São Paulo, SP</span>
            </span>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => {
            const Icon = item.icon
            const childActive = item.children?.some((child) => location.pathname === child.to)
            if (item.children) {
              return (
                <div key={item.label}>
                  <NavLink
                    to={item.to}
                    title={item.label}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      designationsOpen ? 'bg-[#F3F5FB] text-ink' : 'text-[#334155] hover:bg-[#F8FAFC]'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <Icon size={18} className={designationsOpen ? 'text-indigo' : 'text-muted'} />
                    {sidebarCollapsed ? null : item.label}
                  </NavLink>
                  {sidebarCollapsed || !designationsOpen ? null : (
                    <div className="ml-5 mt-1 space-y-0.5 border-l border-line pl-3">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
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
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive && !childActive ? 'bg-[#F3F5FB] text-ink' : 'text-[#334155] hover:bg-[#F8FAFC]'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`
                }
              >
                <Icon size={18} className="text-muted" />
                {sidebarCollapsed ? null : item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className={`border-t border-line p-3 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? '' : 'px-1'}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
              {initials(account?.name ?? '')}
            </span>
            {sidebarCollapsed ? null : (
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
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
                  aria-label="Sair"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-line bg-white px-5 py-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[#F3F5FB]"
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted" aria-label="Trilha">
            {crumbs.map((crumb, index) => (
              <span key={crumb} className="flex items-center gap-1.5">
                {index > 0 ? <ChevronRight size={14} /> : null}
                <span className={index === crumbs.length - 1 ? 'font-medium text-ink' : ''}>{crumb}</span>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <label className="relative hidden md:block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..."
                className="h-10 w-56 rounded-full border border-transparent bg-[#F3F5FB] pl-9 pr-3 text-sm outline-none placeholder:text-[#94A3B8] focus:border-indigo"
                aria-label="Buscar designações"
              />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setNoticesOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:bg-[#F8FAFC]"
                aria-label="Notificações"
              >
                <Bell size={16} />
              </button>
              {noticesOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-white p-3 text-sm text-muted shadow-sm">
                  Nenhuma notificação nova.
                </div>
              ) : null}
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-soft text-xs font-semibold text-indigo">
              {initials(account?.name ?? '')}
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
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
