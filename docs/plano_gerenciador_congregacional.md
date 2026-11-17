# Plano para o gerenciador congregacional

Análise do Territory Manager em outubro de 2026. Este documento só descreve o plano. Nenhum código do app foi alterado por causa dele.

O primeiro passo é fechar as regras do Firestore e carimbar `congregationId` nos dados que já existem. Nenhuma tela nova entra antes disso.

## O que já funciona

O app já cobre territórios, trechos, bairros, locais de saída, grupos de domingo, designações semanais, histórico e usuários com dois papéis: admin e condutor. Flutter, Riverpod, Go Router, Drift e Firebase formam um padrão repetível em `lib/features`. Quase todo documento já tem `congregationId`. O usuário logado carrega o dele, e a função `createUser` grava o novo login na congregação do admin. O cache offline de territórios deve permanecer como está.

## Problemas que impedem várias congregações

As regras isolam parte das coleções pelo `congregationId`, mas não pelo papel. Um condutor autenticado pode gravar territórios, locais e usuários se falar com o Firestore direto.


| Problema                              | Onde aparece                                              | Efeito                                                                                                       |
| ------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Papel só na interface                 | `UserRole` no app; regras não leem `role`                 | Um condutor autenticado pode gravar territórios, usuários e locais se chamar o Firestore direto              |
| Designações abertas                   | `firestore.rules`, coleção `assignments`, comentário TEMP | Qualquer login lê e grava designações de todas as congregações                                               |
| Congregações abertas                  | `match /congregations`                                    | Qualquer login cria, altera ou apaga o cadastro de qualquer congregação                                      |
| `congregationId` vazio vira `default` | `resourceInUserCongregation` e creates com null           | Documento sem id aparece para quem está na congregação `default`, e um create sem id entra nessa congregação |
| Cliente grava usuários                | `firestore_user_repository` e `allow create` em `/users`  | Dá para criar perfil ou mudar o próprio `role` e `congregationId` sem passar pela Function                   |
| Sem tela de congregação               | `CongregationModel` e repositório existem; o router não   | Não há como cadastrar uma segunda congregação com segurança                                                  |




## O que aproveitar


| Já existe                                     | Como usar                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Campo `congregationId` nos modelos e no Drift | Filtrar por ele nas regras e nas queries. Não mover tudo para subcoleções    |
| Padrão de bairros e grupos de campo           | Copiar para anúncios e para o cadastro de publicadores                       |
| Designações semanais e locais de saída        | Continuar como horário do serviço de campo. Não criar outro módulo para isso |
| Usuários com login                            | Manter para quem acessa o app. Publicador sem celular fica em outra coleção  |


O gerador semanal ainda percorre a lista de territórios em ordem. O algoritmo de sugestão e o mapa com polígonos estão só nos documentos de desenho. Não entram no caminho do gerenciador congregacional.

## Arquitetura para várias congregações

Continuar com coleções no topo do Firestore e um campo `congregationId` em cada documento. Mover tudo para subcoleções obrigaria reescrever os repositórios.

Cada usuário pertence a uma congregação. O app não troca de congregação. Um admin de uma congregação não vê a outra.

- **Quem entra.** Login continua no Firebase Auth. O perfil em `users` diz o nome, o papel no app e a congregação. Criar login segue só pela Cloud Function, que copia a congregação do admin.
- **O que é da congregação.** Coleções no topo, como hoje. A query e a regra exigem `congregationId` igual ao do usuário. Criar documento sem esse campo passa a ser negado.
- **Quem não tem login.** `publishers` guarda irmãos que recebem designação ou entregam relatório. O login aponta para um `publisherId` quando a pessoa também usa o app.



### Papéis em duas camadas

No app, por enquanto, admin configura e condutor trabalha território. Privilégios de reunião e de relatório (ancião, servo, pioneiro, secretário) ficam no publicador, como lista curta, quando essa tela existir. Até lá, as funções novas de configuração ficam com o admin. Não criar uma matriz de permissões agora.

### Regras

Um conjunto de funções reutilizadas:


| Função               | Uso                                                               |
| -------------------- | ----------------------------------------------------------------- |
| `signedIn`           | Existe `request.auth`                                             |
| `userCongregationId` | Lê `users` do uid. Sem documento, nega. Não cai mais em `default` |
| `sameCongregation`   | `congregationId` do documento é string e igual ao do usuário      |
| `isAdmin`            | `role` do usuário é `admin` e a congregação confere               |
| `keepsIdentity`      | Update de `users` não altera `role` nem `congregationId`          |


Condutor pode ler territórios, trechos, locais, designações e o próprio histórico, e pode atualizar status de trecho e criar sessão de trabalho da sua congregação. Admin grava a configuração. Na coleção `congregations`, cada um lê só a sua. Alterar nome ou cidade é admin dessa congregação. Apagar congregação não fica no cliente.

### Offline

Drift permanece para o domínio de território que já sincroniza. Anúncios, publicadores, partes de reunião e relatórios mensais não ganham tabela local nesta etapa. O secretário usa essas telas com rede. Assim cada módulo novo não exige migração de schema.

## Ordem de implementação

A ordem segue dependência. Relatório mensal e discurso público precisam de publicador. Publicador precisa de regras que separem congregações. Horário de reunião é um campo no documento da congregação, não um sistema de agenda.


| Ordem | Entrega                             | Por que nesta posição                                                                                                                                           |
| ----- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Regras e congregação fechada        | Sem isso, cada tela nova nasce aberta. Inclui carimbar `congregationId` nos documentos antigos                                                                  |
| 2     | Horários no cadastro da congregação | Meio de semana e fim de semana: dia e hora. Serviço de campo continua nas designações que já existem                                                            |
| 3     | Anúncios e eventos                  | Primeiro módulo novo no padrão dos bairros. Admin grava, membros leem. Um tipo no mesmo documento distingue evento                                              |
| 4     | Publicadores e privilégios          | Coleção própria, separada do login. Privilégios como lista. O usuário do app pode apontar para um publicador                                                    |
| 5     | Reuniões e designações              | Um documento de reunião por data, tipo meio de semana ou fim de semana, com a lista de partes. Discurso público é uma parte do fim de semana, com tema e orador |
| 6     | Relatório mensal                    | Um documento por publicador e mês. Não reutilizar `workSessions`, que registram ruas trabalhadas                                                                |


Locais de saída, grupos de domingo e designações semanais já cobrem o horário de campo. A tela que falta, sessões de pregação, só vale se o botão de gerar a semana for usado de verdade. Pode esperar.

Cada módulo novo segue o mesmo formato: modelo, repositório Firestore, provider Riverpod, lista e formulário, rota, item no menu, regra com as mesmas funções da etapa 1. Sem wrapper offline. Sem mock, exceto se o login demo precisar mostrar a tela.

## Primeiro passo prático

Nenhuma tela nova. O território offline precisa continuar: leitura local, fila de trechos concluídos e envio quando a rede volta. A mudança é nas regras, numa migração única e no bloqueio de gravação direta de usuários.

### Nas regras

- Tirar o acesso total de `assignments` e de `congregations`.
- Exigir `congregationId` no create. Recusar null.
- Ler `role` e só deixar admin gravar configuração.
- Condutor atualiza trecho e cria sessão de trabalho.
- Cliente não cria `users` e não muda `role` nem `congregationId`.
- `passwordResetRequests` continua só no servidor.



### Nos dados e no app

- Script único: documentos sem `congregationId` recebem `default`, o valor que o app já usa hoje.
- Criar usuário só pela Function `createUser`. O repositório que grava `users` no cliente deixa de ser caminho de produção.
- Conferir no aparelho: login, lista de territórios offline, concluir um trecho sem rede e sincronizar depois.

A etapa termina quando um condutor não altera território nem lê designação de outra congregação, o admin segue criando território e usuário na congregação dele, e concluir um trecho offline continua sincronizando.