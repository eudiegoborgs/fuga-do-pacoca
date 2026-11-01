# 🐾 A Fuga do Paçoca

Jogo 2D top-down de furtividade e ação em HTML5 Canvas e JavaScript puro (ES Modules), onde você controla o **Paçoca** — um Yorkshire de 5 kg cheio de pelo e energia — na missão de escapar do Quarto até o Portão da rua sem ser capturado pelos humanos ou encharcado pela mangueira.

---

## ✨ Mecânicas Principais

- **30 Plantas Baixas Dinâmicas (`planta_01` a `planta_30`):** A cada partida, toda a estrutura da casa, os cômodos extras (*Escritório, Lavanderia, Sala de Jantar, Varanda, Despensa, Brinquedoteca, Closet, Jardim de Inverno, Biblioteca, Copa, Sala de TV, Edícula Gourmet*), os obstáculos do quintal e a localização do **Portão de Saída** mudam automaticamente.
- **Minimapa (Planta Baixa):** Exibido no canto inferior direito da tela, mostrando a arquitetura da planta atual e a posição do portão, sem revelar onde estão os personagens.
- **Habilidade de Xixi (`E` — Recarga de 5s):** O Paçoca pode fazer xixi **fora do campo de visão dos humanos**. Quando um humano avista a poça de xixi, fica distraído limpando o chão.
- **Câmeras de Segurança:** 4 câmeras monitoram os cantos da propriedade. Se o Paçoca permanecer no cone de visão da câmera, o alarme dispara e **todos os humanos distraídos retomam a atenção imediatamente**.
- **Cronômetro e Recordes no Localhost:** O jogo mede o tempo exato até a fuga e salva os 10 melhores tempos (apenas quando o Paçoca realmente foge pelo portão) em `localStorage` e no servidor local.
- **Modo Tela Cheia (`F`):** HUD integrado sob/sobre a tela quadrada do jogo e modais de início/fim exibidos dentro do contêiner em tela cheia.

---

## 👨‍👩‍👧‍👦 Personagens da Casa (Sprites 2D)

### Humanos
- **Emily 🩰🛼:** Patina e faz piruetas de balé; tem reação mais lenta (`1.3s`), mas grita alertando toda a casa.
- **Diego 📞💪:** Pai forte com maior alcance de captura e velocidade igual à do Paçoca (`1.00x`); desaparece temporariamente quando recebe uma call de trabalho (`5s`).
- **Stéfanny 💦👑:** Chefe na Garagem (`1.18x` da velocidade do Paçoca); ataca com jatos e poças de água que tiram corações de *Pelo Seco*, mas pode se distrair com TDAH ou com as crianças.
- **Bryan 🎵🏃:** Caminha pela casa e quintal cantarolando (notas musicais visíveis mesmo fora do campo de visão) e chama a mãe.
- **Arthur 🛹✨:** Anda rápido de skate no quintal (`1.05x`), mas faz manobras e perde o foco rapidamente (`1.2s` fora de vista).

### Cães da Casa
- **Spike 🥭💢:** Fiapo de manga do tamanho do Paçoca que fica **parado** em seu canto com um **raio circular (Área de Domínio)**. Se o Paçoca entrar nessa área, eles brigam: trava o movimento por `0.5s`, tira 1 coração e alerta os humanos do mesmo cômodo.
- **Meggie 🐾📢:** Yorkshire pequena de orelha em pé que **se move por toda a casa** com **metade do raio de visão dos humanos**. Não captura nem persegue o Paçoca, mas late alto para alertar os humanos quando o vê.

---

## 🎮 Controles

| Tecla / Botão | Ação |
| :--- | :--- |
| `W A S D` ou `Setas` | Movimenta o Paçoca (velocidade diagonal normalizada) |
| `E` ou botão **💦 Fazer Xixi** | Faz xixi se estiver fora do campo de visão dos humanos (recarga de `5s`) |
| `F` ou botão **⛶ Tela Cheia** | Alterna o modo Tela Cheia |
| `Espaço` | Reinicia a partida na tela de fim de jogo |

---

## 🚀 Como Executar Localmente

Pré-requisito: **Node.js 20+**.

```bash
# Executar a suíte de testes automatizados (23 testes)
npm test

# Iniciar o servidor local em http://localhost:8080
npm start
```

Depois, acesse `http://localhost:8080` no navegador.

---

## ⚙️ CI / GitHub Actions

O repositório conta com pipeline configurada em [`.github/workflows/ci.yml`](.github/workflows/ci.yml), executando automaticamente a suíte de testes (`npm test`) em cada `push` e `pull_request` na branch `main`.
