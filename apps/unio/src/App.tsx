import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { PlaceholderPage } from './components/PlaceholderPage'
import { AudioVideoPage } from './features/audio-video/AudioVideoPage'
import { CleaningPage } from './features/cleaning/CleaningPage'
import { ElderlySupportPage } from './features/elderly-support/ElderlySupportPage'
import { MeetingsPage } from './features/meetings/MeetingsPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/designacoes/reunioes" replace />} />
        <Route
          path="inicio"
          element={
            <PlaceholderPage
              title="Início"
              body="O painel da congregação continua no aplicativo. Aqui o gerenciamento começa pelas designações."
            />
          }
        />
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
        <Route
          path="publicadores"
          element={
            <PlaceholderPage
              title="Publicadores"
              body="O cadastro continua no aplicativo. As designações usam esses nomes quando o Firestore estiver ligado."
            />
          }
        />
        <Route
          path="territorios"
          element={
            <PlaceholderPage
              title="Territórios"
              body="Territórios, trechos e o cache offline permanecem no aplicativo de campo."
            />
          }
        />
        <Route
          path="relatorios"
          element={
            <PlaceholderPage title="Relatórios" body="Os relatórios de campo não fazem parte desta primeira tela." />
          }
        />
        <Route
          path="configuracoes"
          element={
            <PlaceholderPage
              title="Configurações"
              body="Congregação Central, São Paulo. O administrador concede o acesso de cada módulo."
            />
          }
        />
      </Route>
    </Routes>
  )
}
