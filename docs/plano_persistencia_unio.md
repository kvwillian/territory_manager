# Plano — persistir o Unio no banco

O web app já lê congregação, reuniões importadas e escalas de idosos no Firestore. O que a pessoa edita na tela, porém, ainda se perde: publicadores ficam na memória, áudio/vídeo e limpeza ficam no `localStorage`, e os nomes das reuniões ficam no estado do React.

A próxima implementação grava esses dados no Firebase, pelas Cloud Functions. O cliente continua sem escrever direto nas coleções cuja regra já é `create, update, delete: if false`.

Preferência visual não entra nesse trabalho. O tema claro/escuro permanece no `localStorage` (`unio-theme`). Menu recolhido, busca, mês aberto, diálogo e acordeão também continuam estado de tela.

Rascunho também pode ficar no `localStorage` até ser enviado. Enviar é a ação explícita de gravar no banco, em geral publicar. Até lá, a edição sobrevive a um recarregamento neste navegador e não dispara uma função a cada nome. O Firestore guarda o que foi enviado. Outro aparelho e o Flutter só veem isso. Ao enviar com sucesso, o rascunho local daquele registro sai do `localStorage`.

## O que passa a ser o banco

| Dado | Hoje | Destino |
| --- | --- | --- |
| Publicadores da tela | semente em memória (`features/publishers/mock.ts`) | coleção `publishers`, funções que já existem |
| Grupos da tela | cinco grupos fictícios | coleção `publisherGroups`, funções que já existem |
| Nomes, partes, notas e status da reunião | estado React; a importação grava só o rascunho sem nomes | `meetingPrograms`, função nova |
| Escala mensal de áudio e vídeo | `localStorage` `unio-av-rosters` | coleção nova, função nova |
| Responsável da limpeza | `localStorage` `unio-cleaning-assignments` | coleção nova, função nova |

Reuniões de idosos já têm coleção e funções. A tela web já as usa. Não recriar isso.

## Publicadores e grupos

A tela deixa de começar com a lista fictícia. Ao abrir, chama `listPublisherAccounts` e `listCongregationGroups`. Incluir, editar privilégio e marcar apoio ou motorista chamam `createPublisherAccount` e `updatePublisherAccount`. O estado React só guarda o que a função devolveu.

O documento real hoje tem `indicador`, `microfone` e `som`. A tela usa uma lista `duties` e duas marcas de cuidado. A função passa a aceitar, e o documento passa a guardar:

- `estudante` e `volante`, booleanos
- `som` continua sendo o “Áudio” da tela
- `needsElderlySupport` e `driver`, booleanos
- `gender` (`feminino` ou `masculino`) e `age`, porque a tabela mostra e edita os dois

A função só altera um campo quando ele vem no pedido. O app Flutter, ao salvar um publicador, ainda não envia esses campos novos. Por isso eles não podem ser apagados numa atualização que não os mencione. Quando o Flutter for sincronizado, o formulário precisa reenviar o valor que leu, não um falso padrão.

Grupo na tela usa o id, o nome e o `superintendentPublisherId` do documento. A cor da faixa lateral continua só visual, escolhida pela ordem do grupo. Não gravar cor.

Não há, nesta etapa, formulário novo para criar grupo. A aba mostra os grupos que já existirem no banco.

## Reuniões

`meetingPrograms` continua ilegível para escrita do cliente. Nova função `saveMeetingProgram`, permitida a admin ou a quem tem `manageFlags` com `meetings`. A congregação sai do perfil de quem chama, não do corpo do pedido.

O id do documento segue o que a importação já usa: `midweek_{congregationId}_{yyyy-mm-dd}` e `weekend_{congregationId}_{yyyy-mm-dd}`. A função grava kind, data, horário, status, notas, seções e funções. Status `published` pode ser gravado por quem gerencia reuniões, porque a tela já tem esse controle.

A tela deixa de misturar a semana de exemplo com o que veio do Firestore. Abre vazia e preenche com os documentos. O domingo calculado para cada quinta continua podendo ser criado por `ensureWeekendMeetings`. Um domingo editado e ainda não enviado fica no rascunho local; `saveMeetingProgram` grava quando a pessoa envia.

Aceitar uma semana importada continua gravando o rascunho no Firestore, porque aceitar já é enviar. As edições feitas depois, enquanto a reunião não for enviada de novo, ficam no `localStorage` junto com o id da reunião. Publicar chama `saveMeetingProgram` com o conteúdo do rascunho local, se houver, e em seguida apaga essa chave.

## Áudio e vídeo

Nova coleção `audioVideoRosters`. Um documento por congregação e mês, id `{congregationId}_{ano}_{mês}`.

Campos: `congregationId`, `year`, `month`, `rows` (dia, dois indicadores, dois microfones, dois da mesa de som), `reminders`, `omittedDays`.

Leitura direta, para quem já pode ler reuniões da congregação. Escrita só pela função `saveAudioVideoRoster`, com a mesma permissão de gerir reuniões. Enquanto a pessoa monta o mês e ainda não envia, as células ficam num rascunho local. Enviar grava o mês e descarta esse rascunho. A semente de outubro de 2026 deixa de ser carregada como se fosse a escala da congregação. Ela pode continuar no código como exemplo dos testes do cartaz.

## Limpeza

Nova coleção `cleaningAssignments`. Um documento por congregação, id igual ao `congregationId`. O campo `people` é um mapa do id da reunião para o nome do responsável.

Leitura no mesmo critério das reuniões. Escrita pela função `saveCleaningAssignment`, uma vaga por vez. Nome vazio remove a vaga. O texto digitado e ainda não enviado fica no rascunho local daquela reunião. Enviar grava e apaga só essa chave.

## Regras

Nas duas coleções novas, `allow read` se o documento é da congregação de quem está logado e a pessoa pode ler reuniões. `allow create, update, delete: if false`.

Não muda a regra de `publishers`, `publisherGroups`, `meetingPrograms` nem `elderlySupportSchedules`.

## Fora deste plano

- Tema, e qualquer outra preferência só de tela.
- Territórios, Drift e a coleção `assignments` do campo.
- Tela Flutter. O handoff em `docs/handoff_web_para_flutter.md` só deve ser reescrito depois que esta persistência existir, para não descrever um web app que ainda guarda dado só no navegador.

## Ordem

1. Estender o publicador na função e trocar a lista e os grupos fictícios pela leitura e gravação reais.
2. `saveMeetingProgram` e a tela de reuniões sem a semana de exemplo. Edição não enviada fica em rascunho local.
3. Áudio e vídeo no Firestore. O `localStorage` guarda só o mês ainda não enviado.
4. Limpeza no Firestore. O `localStorage` guarda só o responsável ainda não enviado.
5. Atualizar o handoff do Flutter para apontar só para o que estiver no banco.
