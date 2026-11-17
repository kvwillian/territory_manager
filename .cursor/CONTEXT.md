# Territory Manager

Aplicativo Flutter e painel web (Unio) para a gestão de uma congregação. A interface é em português (Brasil). O código (nomes, comentários) permanece em inglês.

O produto é um gerenciador congregacional usado por várias congregações, cada uma com os próprios dados e usuários. Territórios continuam no centro do uso em campo e seguem funcionando offline.

## Princípios

1. Simples de usar no celular, principalmente durante o serviço de campo.
2. Cada congregação isolada das outras.
3. Admin vê todos os módulos. Os demais só veem o que a conta libera.
4. Módulo novo segue o padrão já usado: modelo, repositório, provider Riverpod, telas, rota e regra do Firestore.
5. Offline fica no que já sincroniza (territórios). Cadastros de secretaria nascem online.

A pergunta que o condutor ainda precisa responder rápido:

**Quais ruas deste território ainda faltam cobrir?**

## Navegação

O menu inferior do aplicativo tem quatro abas:

- **Início** — painel da congregação
- **Agenda** — programação do dia e próximas reuniões (`meetingPrograms`)
- **Mapas** — territórios em cartões, com o status de cobertura
- **Menu** — publicadores, habilitações de designação, grupos, escalas (áudio e vídeo, suporte a idosos, limpeza), avisos, horários, cadastros e sair

## Visual

O sistema visual segue a referência Unio:

- Azul-marinho, índigo, violeta, ciano e verde
- Fundo claro
- Cartões brancos com cantos de 16 px
- Botão principal índigo; secundário só com borda
- Selos de status: Disponível, Em progresso, Pendente, Concluído

## Congregações e acesso

Cada usuário pertence a uma congregação. O app não troca de congregação. Todo documento de negócio leva `congregationId`. As regras do Firestore exigem esse campo e separam admin de condutor.

Papel no app:

- **Admin** configura e vê todos os módulos.
- **Condutor** trabalha o que a conta libera.

Flags de acesso (`users.accessFlags`):

- `territories`
- `publishers`
- `meetings`
- `reports`

Flags de gestão (`users.manageFlags`):

- `meetings`
- `publishers`
- `elderlySupport`

Conta antiga sem `accessFlags`: o condutor continua vendo territórios. O admin ignora a lista. Superintendentes de grupo (`supervisedGroupId`) podem consultar os publicadores do próprio grupo.

## O que o app já cobre

**Territórios.** Nome, número, bairro, imagem, link do mapa e trechos de rua. Trecho é pendente ou concluído. O condutor marca o progresso. O cache local é Drift. Mapas lista os territórios.

**Campo.** Bairros, locais de saída, grupos de domingo e designações semanais. A sessão de trabalho registra território, data, condutor e trechos concluídos.

**Congregação.** Nome, cidade, estado (`state`/`estado`/`uf`), país, e dia/hora da reunião do meio de semana e do fim de semana.

**Avisos.** Anúncio ou evento. Admin publica. Quem está na congregação lê.

**Publicadores e Grupos.** Cadastro separado do login com informações pessoais (nome, idade, gênero, telefone, grupo, status) e privilégio congregacional/pioneiro. As funções de designação (`estudante`, `indicador`, `volante`, `microfone`, `som`) e marcas de cuidado (`needsElderlySupport`, `driver`) são configuradas na área de **Designações → Habilitações** (`/designacoes/habilitacoes` no Web e `/qualifications` no Flutter).

**Escalas e Reuniões.**
- **Agenda (`/agenda`):** Lê `meetingPrograms` do Firestore (mostrando `published` para membros e incluindo `draft` para quem gerencia reuniões).
- **Áudio e Vídeo (`/audio-video`):** Escala mensal (`audioVideoRosters`).
- **Suporte a Idosos (`/elderly-support`):** Escalas de caronas (`elderlySupportSchedules`).
- **Limpeza (`/cleaning`):** Designações de limpeza (`cleaningAssignments`).

**Conta.** Login, criação de usuário pela Cloud Function `createUser`, e senha temporária por e-mail. Quem entra com essa senha precisa escolher outra no app antes de continuar.

## O que ainda não entra

- Relatório mensal de serviço de campo (`/module/relatorios`). Não reutilizar `workSessions`.
- Troca ou criação de uma segunda congregação na interface.
- Mapa geográfico com polígonos e sugestão automática de território.
