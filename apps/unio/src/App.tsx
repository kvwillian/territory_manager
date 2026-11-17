import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { PlaceholderPage } from './components/PlaceholderPage'
import { AudioVideoPage } from './features/audio-video/AudioVideoPage'
import { CleaningPage } from './features/cleaning/CleaningPage'
import { ElderlySupportPage } from './features/elderly-support/ElderlySupportPage'
import { MeetingsPage } from './features/meetings/MeetingsPage'
import { HomePage } from './features/home/HomePage'
import { useMeetings } from './store'
import { PublishersPage } from './features/publishers/PublishersPage'
import { QualificationsPage } from './features/publishers/QualificationsPage'
import { TerritoriesPage } from './features/territories/TerritoriesPage'

function SettingsPage() {
  const { congregation } = useMeetings()
  const where = [congregation.name, congregation.place].filter(Boolean).join(', ')
  return (
    <PlaceholderPage
      title="Configurações"
      body={`${where}. O administrador concede o acesso de cada módulo.`}
    />
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/inicio" replace />} />
        <Route path="inicio" element={<HomePage />} />
        <Route
          path="agenda"
          element={
            <PlaceholderPage
              title="Agenda"
              body="A visualização da agenda fica no aplicativo. Este painel publica as reuniões que aparecem lá."
            />
          }
        />
        <Route path="designacoes/reunioes" element={<MeetingsPage />} />
        <Route path="designacoes/audio-video" element={<AudioVideoPage />} />
        <Route path="designacoes/idosos" element={<ElderlySupportPage />} />
        <Route path="designacoes/limpeza" element={<CleaningPage />} />
        <Route path="designacoes/habilitacoes" element={<QualificationsPage />} />
        <Route path="publicadores" element={<PublishersPage />} />
        <Route path="publicadores/grupos" element={<PublishersPage />} />
        <Route path="publicadores/estatisticas" element={<PublishersPage />} />
        <Route path="territorios" element={<TerritoriesPage />} />
        <Route path="territorios/lista" element={<TerritoriesPage />} />
        <Route path="territorios/locais" element={<TerritoriesPage />} />
        <Route path="territorios/historico" element={<TerritoriesPage />} />
        <Route
          path="relatorios"
          element={
            <PlaceholderPage title="Relatórios" body="Os relatórios de campo não fazem parte desta primeira tela." />
          }
        />
        <Route
          path="configuracoes"
          element={
            <SettingsPage />
          }
        />
      </Route>
    </Routes>
  )
}
