import { CalendarCheck2, Clock, Home, Map as MapIcon, MapPin, RefreshCw } from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AssignmentsTab } from './components/AssignmentsTab'
import { DepartureLocationsTab } from './components/DepartureLocationsTab'
import { TerritoriesCatalogTab } from './components/TerritoriesCatalogTab'
import { TerritoryHistoryTab } from './components/TerritoryHistoryTab'
import { TerritoriesProvider, useTerritories } from './store'

type TerritoryTabKey = 'designacoes' | 'territorios' | 'locais' | 'historico'

const TABS: Array<{
  key: TerritoryTabKey
  path: string
  label: string
  headerTitle: string
  headerSubtitle: string
  icon: ComponentType<{ size?: number; className?: string }>
}> = [
  {
    key: 'designacoes',
    path: '/territorios',
    label: 'Designações',
    headerTitle: 'Territórios',
    headerSubtitle:
      'Planeje as saídas, gerencie os territórios e acompanhe o histórico da pregação de casa em casa.',
    icon: CalendarCheck2,
  },
  {
    key: 'territorios',
    path: '/territorios/lista',
    label: 'Territórios',
    headerTitle: 'Territórios',
    headerSubtitle: 'Cadastre e organize os territórios por região.',
    icon: MapIcon,
  },
  {
    key: 'locais',
    path: '/territorios/locais',
    label: 'Locais de saída',
    headerTitle: 'Locais de saída',
    headerSubtitle:
      'Cadastre as saídas recorrentes da congregação, com dias, horários, dirigentes e territórios.',
    icon: Home,
  },
  {
    key: 'historico',
    path: '/territorios/historico',
    label: 'Histórico',
    headerTitle: 'Histórico de designações',
    headerSubtitle: 'Consulte as saídas realizadas e os territórios trabalhados.',
    icon: Clock,
  },
]

function resolveActiveTab(pathname: string): TerritoryTabKey {
  if (pathname.startsWith('/territorios/lista')) return 'territorios'
  if (pathname.startsWith('/territorios/locais')) return 'locais'
  if (pathname.startsWith('/territorios/historico')) return 'historico'
  return 'designacoes'
}

function TerritoriesPageContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { ready, error, reload } = useTerritories()

  const activeTabKey = resolveActiveTab(location.pathname)
  const activeMeta = TABS.find((t) => t.key === activeTabKey) ?? TABS[0]!

  const [historyLocationSeed, setHistoryLocationSeed] = useState('')
  const [plannerTargetDate, setPlannerTargetDate] = useState<string | null>(null)

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 px-3.5 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
      {/* Contextual Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-soft text-indigo sm:h-12 sm:w-12">
            <MapPin size={20} className="sm:h-[22px] sm:w-[22px]" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {activeMeta.headerTitle}
            </h1>
            <p className="mt-0.5 text-xs text-muted sm:text-sm">{activeMeta.headerSubtitle}</p>
          </div>
        </div>
      </div>

      {/* 4-Tab Bar */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-line">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.key === activeTabKey
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-xl border border-b-2 px-3.5 py-2.5 text-sm font-semibold transition sm:px-4 ${
                isActive
                  ? 'border-line border-b-indigo bg-white text-indigo shadow-[0_-1px_2px_rgba(15,23,42,0.03)]'
                  : 'border-transparent bg-transparent text-[#475569] hover:bg-white/60 hover:text-ink'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-indigo' : 'text-muted'} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Loading / Error / Content */}
      {!ready ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center text-sm text-muted">
          Carregando módulo de territórios...
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B91C1C]"
          >
            <RefreshCw size={13} />
            Tentar novamente
          </button>
        </div>
      ) : activeTabKey === 'designacoes' ? (
        <AssignmentsTab
          externalIsoDate={plannerTargetDate}
          onClearExternalIsoDate={() => setPlannerTargetDate(null)}
          onNavigateToHistory={(locName) => {
            setHistoryLocationSeed(locName ?? '')
            navigate('/territorios/historico')
          }}
        />
      ) : activeTabKey === 'territorios' ? (
        <TerritoriesCatalogTab />
      ) : activeTabKey === 'locais' ? (
        <DepartureLocationsTab
          onOpenDateInPlanner={(isoDate) => {
            setPlannerTargetDate(isoDate)
            navigate('/territorios')
          }}
        />
      ) : (
        <TerritoryHistoryTab
          initialLocationFilter={historyLocationSeed}
          onOpenDateInPlanner={(isoDate) => {
            setPlannerTargetDate(isoDate)
            navigate('/territorios')
          }}
        />
      )}
    </div>
  )
}

export function TerritoriesPage() {
  return (
    <TerritoriesProvider>
      <TerritoriesPageContent />
    </TerritoriesProvider>
  )
}
