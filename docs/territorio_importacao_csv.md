# Importação em massa de histórico de territórios (CSV)

O app aceita um CSV (colar conteúdo no ecrã **Importar histórico**) ou o formato texto livre antigo. Aqui está o **CSV padronizado**.

## Cabeçalho (primeira linha)

Colunas reconhecidas (nome **case-insensitive**; acentos no título são normalizados):

| Chave lógica | Cabeçalhos aceites (exemplos) | Obrigatória |
|--------------|-------------------------------|-------------|
| `data` | `data`, `date`, `data_trabalho` | Sim |
| `bairro` | `bairro`, `neighborhood` | Sim |
| `territorio` | `territorio`, `território`, `numero_territorio`, `nr_territorio` | Sim |
| `segmento` | `segmento`, `segmentos`, `segment` | Não |
| `dirigente` | `dirigente`, `conductor`, `dirigente_nome` | Não |
| `notas` | `notas`, `notes`, `obs`, `observacoes` | Não |

A ordem das colunas é livre.

## Formato da coluna `data`

1. **Recomendado (ISO 8601, só data):** `AAAA-MM-DD`  
   Exemplo: `2026-04-19`

2. **Alternativo:** `DD/MM/AAAA` ou `DD-MM-AAAA` (dia/mês/ano).  
   Exemplo: `19/04/2026`

3. Ano com **dois dígitos** (`DD/MM/AA`): assume `20xx` (ex.: `26` → `2026`).

## `territorio` e `segmento`

- **territorio:** número do território no app (`15`, `01`, etc.). `1` e `01` são tratados como iguais.
- **segmento vazio:** todos os segmentos desse território ficam concluídos nessa data.
- **segmento preenchido:** texto que deve bater com a **descrição** do segmento (ex.: `A`, `B`, `PARTE`). Vários sufixos na mesma célula, separados por **vírgula**: `A, B` equivale a marcar sufixos `A` e `B` para o **mesmo** número de território dessa linha.

## Separador

- **Vírgula** (`,`) por defeito.
- **Ponto e vírgula** (`;`) se na primeira linha houver mais `;` que `,` (comum no Excel em PT).

## Exemplo

```csv
data,bairro,territorio,segmento,dirigente,notas
2026-04-19,Laranjeiras,15,,Bessa,
2026-04-19,Laranjeiras,16,,Bessa,
2026-04-21,Laranjeiras,13,B,Eber,
2026-04-25,Laranjeiras,20,final,Roberto,
2026-04-25,Laranjeiras,22,final,Roberto,
```

Cada linha com vários sufixos na coluna `segmento` (ex.: `18A, 19A`) aplica ambos ao **mesmo** `territorio` dessa linha.

## Deteção automática

Se a primeira linha contiver as palavras-chave `data`, `bairro` e `territorio`, o conteúdo é tratado como CSV; caso contrário, usa-se o formato texto livre (DD.MM - dirigente - refs).
