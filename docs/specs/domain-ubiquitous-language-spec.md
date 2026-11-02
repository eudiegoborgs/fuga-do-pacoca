# Especificação do Domínio e Linguagem Ubíqua — *A Fuga do Paçoca*

> **Público-alvo:** Desenvolvedores de domínio, Game Designers e Engenheiros de QA que precisam consultar ou evoluir as regras de negócio, invariantes espaciais e vocabulário oficial do jogo.

---

## 1. Dicionário da Linguagem Ubíqua (`src/domain/ubiquitous-language.js`)

| Termo no Domínio | Identificador no Código | Significado na Regra de Negócio |
| :--- | :--- | :--- |
| **Partida em Andamento** | `EstadoDaPartida.EM_ANDAMENTO` (`'playing'`) | Estado ativo enquanto o cronômetro corre e o Paçoca tenta alcançar o Portão. |
| **Fuga Concluída** | `EstadoDaPartida.FUGA_CONCLUIDA` (`'won'`) | Único estado terminal que registra o `escapeTime` como **Recorde de Fuga**. |
| **Capturado no Colo** | `EstadoDaPartida.CAPTURADO_NO_COLO` (`'captured'`) | Estado terminal quando qualquer um dos 5 humanos encosta no Paçoca. Não gera recorde. |
| **Encharcado de Banho** | `EstadoDaPartida.ENCHARCADO_DE_BANHO` (`'soaked'`) | Estado terminal quando os 3 corações de *Pelo Seco* chegam a zero. Não gera recorde. |
| **Ponto Cego Inicial** | `isPacocaInStartSafeBlindSpot` | Região interna do `quarto_1` onde o Paçoca nasce protegido da visão externa até sair pela porta. |
| **Poça de Xixi** | `peePuddles` / `ModoDoHumano.LIMPANDO_XIXI` | Distração criada pelo Paçoca (recarga de `5.0s`) exclusivamente quando fora do cone de visão de todos os humanos ativos. |
| **Área de Domínio do Spike** | `SPIKE_DOMAIN_RADIUS` (`95px`) | Raio circular fixo ao redor do Spike (que permanece sempre parado). Entrar nessa área com linha de visão trava o Paçoca por `0.5s`, causa 1 de dano e alerta humanos no mesmo cômodo. |
| **Ronda da Meggie** | `ModoDoCao.RONDA_PELA_CASA` / `MEGGIE_VISION_RANGE` (`95px`) | Patrulha contínua da Meggie pelos cômodos internos com exatamente **metade do raio de visão dos humanos** (`95px` vs `190px`). Ao avistar o Paçoca, late e alerta a família. |

---

## 2. Invariantes de Domínio

1. **Ocupação Mínima da Casa (`countOtherActiveIndoorHumans`):**
   - Sempre deve existir ao menos **1 humano ativo dentro da casa**. Se apenas um humano ativo estiver na área interna, ele não atravessa as portas externas e o Diego adia chamadas de trabalho.
2. **Stéfanny Fixa na Garagem (`stayInGarage: true`):**
   - A Stéfanny patrulha exclusivamente a Garagem, lançando poças/jatos de água quando ativa.
3. **Arthur Fixo no Quintal (`stayInYard: true`):**
   - O Arthur anda de skate exclusivamente pelos quintais.
4. **Despertar Imediato por Alarme de Câmera (`wakeDistractedHumanOnCameraAlert`):**
   - Quando qualquer câmera (`Câm 1`..`Câm 4`) detecta o Paçoca por `>= 0.35s`, todos os humanos distraídos (em call, pirueta, manobra de skate, TDAH ou limpando xixi) retomam a atenção no ato.
5. **Elegibilidade de Recorde (`recordEscapeWin`):**
   - O tempo da partida (`escapeTime`) só é persistido no ranking se, e somente se, `status === EstadoDaPartida.FUGA_CONCLUIDA`.
