# Handoff — Unio web para o app Flutter

Os dois apps (`apps/unio` e `lib/`) usam o mesmo Firebase Auth e o mesmo projeto Firestore/Cloud Functions.

Interface em português. Código em inglês. Semana da congregação no estilo Dart: segunda = 1 … domingo = 7. No JavaScript, domingo é 0. O mapeamento é 7 → 0; os outros dias usam o mesmo número.

## Separação entre Publicadores e Designações (Habilitações)

- **Publicadores (`/publicadores` no Web, `/publishers` no Flutter):** Exibe e edita apenas os dados pessoais e congregacionais do publicador: Nome, Idade, Gênero, Telefone, Grupo (`groupId`), Status (`active` | `inactive`), Privilégio congregacional (`publisher` | `ministerialServant` | `elder`) e Serviço de pioneiro (`none` | `auxiliary` | `regular`).
- **Designações → Habilitações (`/designacoes/habilitacoes` no Web, `/qualifications` no Flutter):** Subpágina dedicada para marcar o que cada publicador ativo pode fazer:
  - `estudante` (Estudante)
  - `indicador` (Indicador)
  - `volante` (Volante)
  - `microfone` (Microfone)
  - `som` / `audio` (Áudio / Som)
  - `needsElderlySupport` (Precisa de apoio)
  - `driver` (Motorista)

## O que já está sincronizado no Flutter

1. **Congregação (`congregations/{congregationId}`):**
   - `CongregationModel` lê `name`, `city`, `state` (ou `estado` / `uf`), `country`, `midweekWeekday`, `midweekTime`, `weekendWeekday`, `weekendTime`.
   - O cartão da congregação no painel inicial exibe `cidade, estado, país`.

2. **Usuário (`users/{uid}`):**
   - `UserModel` lê `role`, `congregationId`, `accessFlags`, `manageFlags` (`meetings`, `publishers`, `elderlySupport`), `publisherId` e `supervisedGroupId`.
   - A tela de administração de usuários (`UsersListScreen`) edita tanto `accessFlags` (visualização) quanto `manageFlags` (gestão).
   - Superintendentes de grupo (`supervisedGroupId`) sem acesso amplo a `publishers` consultam apenas o próprio grupo e os publicadores com `groupId == supervisedGroupId`.

3. **Agenda e Reuniões (`meetingPrograms`):**
   - `AgendaScreen` lê `meetingPrograms` da congregação via `meetingProgramsProvider`, exibindo reuniões publicadas (e rascunhos para quem tem `canManageMeetings`).

4. **Publicadores e Grupos (`publishers` e `publisherGroups`):**
   - `PublisherFormScreen` edita Nome, Idade, Gênero, Telefone, Grupo, Status, Privilégio e Pioneiro, preservando todas as marcas de habilitação de designação.
   - `PublisherGroupsScreen` exibe os grupos, superintendente, ajudante e membros, permitindo criar/excluir grupo e alterar o superintendente via Cloud Functions (`createCongregationGroup`, `setCongregationGroupSuperintendent`, `deleteCongregationGroup`) para quem tem `canManagePublishers`.

5. **Escalas de Designação:**
   - **Habilitações (`/qualifications`):** `PublisherQualificationsScreen` permite filtrar e alternar rapidamente as habilitações de cada publicador ativo.
   - **Áudio e Vídeo (`/audio-video`):** `AudioVideoRosterScreen` lê `audioVideoRosters`.
   - **Limpeza (`/cleaning`):** `CleaningAssignmentsScreen` lê `cleaningAssignments/{congregationId}`.
   - **Suporte a Idosos (`/elderly-support`):** `ElderlySupportScreen` lê `elderlySupportSchedules` e permite criar/atualizar designações e publicar/despublicar escalas para quem tem `canManageElderlySupport`.
