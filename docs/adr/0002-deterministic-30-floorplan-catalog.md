# ADR 0002: Catálogo Determinístico de 30 Plantas Baixas com Sorteio sem Repetição

- **Status:** Aceito
- **Data:** 2026-11-01
- **Público-alvo:** Game Designers e Desenvolvedores responsáveis pelo gerador de mapas (`src/domain/house/`) e testes de simulação de rota.

---

## Contexto

O jogo exige que toda a planta baixa da casa, os cômodos extras, o layout do quintal e a posição do Portão mudem a cada partida. Uma geração procedural totalmente aleatória em tempo real poderia criar corredores sem saída, portas bloqueadas por paredes ou pontos de nascimento expostos às câmeras.

## Decisão

1. Definimos um catálogo parametrizado de **30 plantas baixas distintas** (`planta_01` a `planta_30` em `src/domain/house/floorplan-catalog.js`), combinando 12 tipos de cômodos extras, alas leste de 4 ou 5 cômodos, anexos na ala oeste, edículas no quintal e diferentes zonas para o `Portão`.
2. Para o sorteio entre partidas (`generateHouseLayout` em `src/domain/house/house-layout-generator.js`), utilizamos uma **sacola embaralhada (Shuffled Bag)** que garante que duas partidas consecutivas nunca repitam a mesma planta nem a mesma posição do portão.
3. Cada planta baixa exporta rotas de referência (`indoorEscapePath` e `yardEscapePath`) verificadas por testes automatizados de simulação (`tests/integration.test.js` e `tests/map.test.js`).

## Consequências

- **Positivas:** Variedade arquitetural alta (30 plantas com cômodos e estruturas distintas) com garantia matemática de que todas as partidas possuem rotas de fuga válidas e ponto cego seguro no quarto inicial.
- **Limitação conhecida:** Para expandir além de 30 plantas, novos presets devem respeitar as invariantes geométricas validadas em `tests/map.test.js`.
