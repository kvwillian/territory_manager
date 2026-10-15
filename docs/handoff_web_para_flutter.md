# Handoff — Unio web para o app Flutter

A próxima etapa é o Flutter passar a ler o que o web Unio já grava no Firebase. Os dois apps usam o mesmo Firebase Auth e o mesmo projeto. Não criar um segundo login.

Código do web: `apps/unio`. Código do app: `lib/`. Funções: `functions/src`. Regras: `firestore.rules`.

Interface em português. Código em inglês. Semana da congregação no estilo Dart: segunda = 1 … domingo = 7. No JavaScript, domingo é 0. O mapeamento é 7 → 0; os outros dias usam o mesmo número. Esta congregação se reúne na quinta (4) e no domingo (7). O domingo da semana é o domingo na data da quinta ou depois dela, nunca o domingo anterior.

## O que não mexer

- Coleção `assignments` e o Drift. Isso é designação de território e sessão de campo, não parte de reunião.
- `fieldGroups`. É o grupo de domingo do campo, só com nome. Grupo de publicadores com superintendente é outra coleção: `publisherGroups`.
- Territórios, trechos, locais de saída, sessões de pregação e a fila offline.
- Escrita direta do cliente em `meetingPrograms`, `publishers`, `publisherGroups` e `elderlySupportSchedules`. As regras negam create/update/delete. Quem grava é Cloud Function.

## O que o Flutter deve passar a ler

### Congregação

Documento `congregations/{congregationId}`.

- `name`, `city`, `country`
- `state`, `estado` ou `uf`, se existir
- `midweekWeekday`, `midweekTime` (`HH:mm`)
- `weekendWeekday`, `weekendTime`

O web mostra nome na primeira linha e cidade, estado e país na segunda. O Flutter já tem esse modelo, sem o estado. Se o campo existir no documento, mostrar.

### Usuário

`users/{uid}`.

- `role`: `admin` ou `conductor`
- `congregationId`
- `accessFlags`: ver `territories`, `publishers`, `meetings`, `reports`
- `manageFlags`: gerir `meetings`, `elderlySupport`, `publishers`
- `publisherId`: vínculo opcional com `publishers/{id}`
- `supervisedGroupId`: grupo do qual a pessoa é superintendente

Admin ignora as flags. O próprio usuário não pode alterar papel, congregação, flags, `publisherId` nem `supervisedGroupId`. Superintendente de grupo não é admin: só lê os publicadores daquele `groupId`.

### Reuniões

Coleção `meetingPrograms`. Leitura direta. Escrita só por função.

Id determinístico:

- `midweek_{congregationId}_{yyyy-mm-dd}`
- `weekend_{congregationId}_{yyyy-mm-dd}`

Campos:

- `congregationId`, `kind` (`midweek` | `weekend`), `isoDate`, `time`
- `status`: `draft` | `published` | `notStarted` | `completed`
- `notes`
- `sections[]`: `id`, `title`, `token` (`treasures` | `ministry` | `christianLife` | `neutral`), `parts[]`
- parte: `id`, `title`, `durationMinutes`, `hint?`, `structural?`, `pinned?`, `roles[]`
- papel: `id`, `label`, `personName`, `showLabel`
- `duties[]`: `id`, `label`, `people[]` (um nome por vaga)

Meio de semana, sempre nesta ordem: Tesouros da Palavra de Deus, Faça Seu Melhor no Ministério, Nossa Vida Cristã. Funções da reunião: Presidente, Oração final, Indicadores, Volantes, Áudio e Vídeo. Fim de semana: Oração inicial, Presidente, Discurso público, A Sentinela (Dirigente e Leitor), mais Indicadores, Volantes e Áudio e Vídeo.

`ensureWeekendMeetings` cria o rascunho de domingo para cada quinta que ainda não tem fim de semana. O cliente web chama essa função ao carregar; se ela falhar, a tela ainda mostra o domingo calculado, mas o documento só existe depois da função.

Importação da apostila (`processMeetingImport`, `acceptMeetingWeek`) grava só o meio de semana, como rascunho, sem nomes. Não sobrescreve reunião que já existe. O PDF fica em `meeting-imports/{uid}/{importId}/source.pdf` e é apagado ao concluir.

Para a agenda do Flutter: ler `meetingPrograms` da congregação e mostrar o que está `published`. Rascunho fica para quem tem `manageFlags` com `meetings` ou é admin. Não gravar reunião pelo cliente. Não usar a coleção `assignments`.

A edição de nomes na tela de reuniões do web ainda está só na memória do React. O que o Firestore tem é o que a importação aceitou e o que `ensureWeekendMeetings` criou. Nomes designados na tela web ainda não voltam para o documento.

### Publicadores e grupos

Coleção `publishers/{id}`. Leitura direta, com as regras acima. Escrita pelas funções:

- `createPublisherAccount`
- `updatePublisherAccount`
- `deletePublisherAccount`
- `listPublisherAccounts`

O repositório Flutter `FirestorePublisherRepository` já chama create, update e delete. A leitura continua no Firestore.

Documento real:

- `name`, `congregationId`, `phone?`, `email?`
- `privilege`: `publisher` | `ministerialServant` | `elder`
- `pioneer`: `none` | `auxiliary` | `regular`
- `indicador`, `microfone`, `som` (booleanos)
- `groupId?`, `userId?`
- `status`: `active` | `inactive` (ausente = ativo)
- `createdAt`, `updatedAt`

Não há gênero nem idade no Firestore.

Coleção `publisherGroups/{id}`:

- `congregationId`, `name`
- `superintendentPublisherId`, `assistantPublisherId?`, `description?`
- membros não ficam dentro do grupo: são os publicadores com aquele `groupId`

Funções: `createCongregationGroup`, `updateCongregationGroup`, `listCongregationGroups`, `listCongregationGroupMembers`, `setCongregationGroupSuperintendent`, `setCongregationPublisherGroup`, `deleteCongregationGroup`.

Apagar o grupo zera `groupId` dos membros e `supervisedGroupId` de quem era o superintendente. Não apaga publicadores. Não dá para mover o superintendente para outro grupo enquanto ele ainda for o superintendente do grupo atual.

O Flutter ainda não tem tela de grupos nem de superintendente. O formulário de publicador ainda não edita telefone, e-mail, grupo, status nem as marcas novas de idosos.

### Suporte a idosos

Coleção `elderlySupportSchedules`. Escrita só por função, para quem gerencia o módulo. Leitura para qualquer conta da mesma congregação.

- `createElderlySupportSchedule`
- `listElderlySupportSchedules`
- `getElderlySupportSchedule`
- `updateElderlySupportAssignments`
- `publishElderlySupportSchedule`
- `unpublishElderlySupportSchedule`

Cada escala tem `congregationId`, `status` (`draft` | `published`), `note?`, `assignments[]`. Cada item: `date`, `elderlyName`, `elderlyPublisherId?`, `driverName`, `driverPublisherId?`. As datas da tela web são as datas das reuniões já cadastradas, não um calendário livre.

O Flutter ainda não tem esta tela.

## O que ainda é só do navegador

| Dado | Onde fica | Quando vai ao banco |
| --- | --- | --- |
| Tema | `localStorage` `unio-theme` | não vai |
| Rascunho de reunião | `localStorage` `unio-meeting-drafts` | ao publicar, concluir ou voltar para rascunho, pela função `saveMeetingProgram` |
| Rascunho de áudio e vídeo | `localStorage` `unio-av-drafts` | no botão Enviar mês, pela função `saveAudioVideoRoster` |
| Rascunho de limpeza | `localStorage` `unio-cleaning-drafts` | no botão Enviar da linha, pela função `saveCleaningAssignment` |

O rascunho só é apagado depois que a função confirma. Se o envio falha, ele continua neste navegador.

Publicadores e grupos da tela vêm de `listPublisherAccounts` e `listCongregationGroups`. Salvar chama `createPublisherAccount` ou `updatePublisherAccount`. A função só grava `estudante`, `volante`, `needsElderlySupport`, `driver`, `gender` e `age` quando o pedido traz o campo, para um salvamento antigo do Flutter não apagar essas marcas.

Quem está na congregação pode ler reuniões, áudio/vídeo, limpeza e a escala de idosos. Gravar continua restrito a quem administra o módulo, e a congregação é a do perfil de quem chama. Territórios, Drift e a coleção `assignments` do campo não mudaram.

Correspondência da tela com o documento:

| Marca na tela web | Campo no Firestore |
| --- | --- |
| `indicador` | `indicador` |
| `microfone` | `microfone` |
| `audio` | `som` |
| `volante` | `volante` |
| `estudante` | `estudante` |
| `needsElderlySupport` | `needsElderlySupport` |
| `driver` | `driver` |

Quem pode ser designado, do jeito que a tela web já filtra:

- Estudante: `estudante`
- Indicadores: `indicador`
- Volantes da reunião, e a coluna Microfones: `volante` ou `microfone`; quem tem `som` / `audio` também entra em Microfones
- Áudio e vídeo, e a coluna Mesa de som: só `som` / `audio`
- Presidente: `elder` ou `ministerialServant`
- Orador, participante, leitor, dirigente e oração: qualquer publicador ativo
- Idoso na escala: `needsElderlySupport`
- Motorista na escala: `driver`

Uma pessoa pode ter várias marcas. Precisar de apoio não é privilégio de reunião. Motorista também não. As duas são independentes: dá para ter as duas, uma, ou nenhuma.

O Flutter, ao atualizar um publicador, não deve mandar esses campos novos como falso se não os leu. A função só os altera quando o pedido inclui a chave.

## Ordem sugerida no Flutter

1. Agenda lê `meetingPrograms` da congregação, com o dia real do `isoDate`. Meio de semana na quinta e fim de semana no domingo, conforme o documento da congregação.
2. Mostrar partes e funções em leitura. Designar pelo celular só quando for chamar `saveMeetingProgram`.
3. Publicadores: usar o documento Firestore que o repositório já lê. Ao salvar, reenviar `estudante`, `volante`, `needsElderlySupport`, `driver`, `gender` e `age` se existirem.
4. Grupos: ler `publisherGroups` e os publicadores com `groupId`. Superintendente continua sem poder de admin.
5. Áudio/vídeo está em `audioVideoRosters`. Limpeza está em `cleaningAssignments/{congregationId}`.

## Onde olhar no web

- Rotas: `apps/unio/src/App.tsx`
- Reuniões carregadas e fim de semana calculado: `apps/unio/src/store.tsx`, `apps/unio/src/domain/`
- Documento de reunião: `apps/unio/src/features/meetings/storedMeetings.ts`
- Quem pode cada vaga: `apps/unio/src/features/publishers/assignments.ts`
- Marcas da lista, inclusive idosos e motorista: `apps/unio/src/features/publishers/mock.ts`
- Escala de idosos: `apps/unio/src/features/elderly-support/`
- Funções de publicador: `functions/src/publishers/registry.ts`
- Funções de reunião: `functions/src/meetingImport.ts`
- Funções de idosos: `functions/src/elderlySupport/schedule.ts`
