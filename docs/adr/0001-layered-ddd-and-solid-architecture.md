# ADR 0001: Arquitetura em Camadas com DDD, Princípios SOLID e Governança via Dependency Cruiser

- **Status:** Aceito
- **Data:** 2026-11-01
- **Público-alvo:** Engenheiros de Software e Arquitetos responsáveis pela manutenção, evolução e revisão de código do projeto.

---

## Contexto

À medida que o jogo *A Fuga do Paçoca* evoluiu (30 plantas baixas dinâmicas, habilidade de xixi, minimapa, câmeras que acordam humanos distraídos, dois cães com mecânicas distintas e persistência de recordes), concentrar regras de negócio, física 2D, persistência e manipulação de DOM/Canvas em poucos arquivos aumentava o acoplamento e o risco de regressões.

## Decisão

Adotamos uma arquitetura inspirada em **Domain-Driven Design (DDD)** e **Clean/Layered Architecture**, dividida em 4 camadas explícitas dentro de `src/`:

```text
src/
├── config/                  # Configuração Centralizada com Contexto e Variáveis de Ambiente
│   └── game-config.js
├── container/               # Inversão de Controle (IoC Container & Injeção de Dependência)
│   └── ioc-container.js
├── domain/                  # Camada Pura de Domínio (Estados da Partida, Geometria, Casa, Família, Regras)
│   ├── partida-states.js
│   ├── geometry/
│   │   └── spatial-vision.js
│   ├── house/
│   │   ├── floorplan-catalog.js
│   │   └── house-layout-generator.js
│   ├── family/
│   │   └── family-roster-factory.js
│   └── rules/
│       ├── house-zones.js
│       ├── stealth-and-pee-rules.js
│       ├── dog-behavior-rules.js
│       └── human-behavior-rules.js
├── application/             # Casos de Uso e Portas (Orquestração sem acoplamento com UI/Infra)
│   ├── ports/
│   │   └── record-repository-port.js
│   └── use-cases/
│       ├── escape-records-use-case.js
│       └── escape-simulation-use-case.js
├── infrastructure/          # Adaptadores Externos (Web Audio API, LocalStorage + HTTP /api/records)
│   ├── audio/
│   │   └── web-audio-sound-engine.js
│   └── storage/
│       └── localhost-record-repository.js
└── presentation/            # Interface Gráfica (Canvas 2D, Gamepad de Toque e Controlador DOM/Tela Cheia)
    ├── canvas/
    │   └── game-renderer.js
    └── ui/
        └── game-controller.js
```

### Aplicação Prática de SOLID

1. **Single Responsibility Principle (SRP):**
   - Geometria óptica (`spatial-vision.js`), geração das 30 plantas (`house-layout-generator.js`), regras de furtividade/xixi (`stealth-and-pee-rules.js`), comportamento dos cães (`dog-behavior-rules.js`) e comportamento dos humanos (`human-behavior-rules.js`) têm responsabilidades únicas e razões distintas para mudar.
2. **Open/Closed Principle (OCP):**
   - Em `human-behavior-rules.js`, o despacho de comportamento usa o mapa imutável `HUMAN_BEHAVIOR_STRATEGIES`, permitindo adicionar ou ajustar estratégias de personagens sem modificar um bloco condicional monolítico.
3. **Dependency Inversion Principle (DIP):**
   - O caso de uso de recordes (`escape-records-use-case.js`) depende da abstração de armazenamento injetável (`storage` / `onPersistRemote`) definida na porta `record-repository-port.js`, permitindo testar toda a regra em memória no Node.js sem navegador.

### Validação Automatizada de Arquitetura (`dependency-cruiser`)

As fronteiras entre camadas são validadas automaticamente em `.dependency-cruiser.cjs` via `npm run arch:check`:
- `domain-must-remain-pure`: proíbe `src/domain/**` de importar `application`, `infrastructure` ou `presentation`.
- `application-must-not-depend-on-outer-layers`: proíbe `src/application/**` de importar `infrastructure` ou `presentation`.
- `infrastructure-must-not-depend-on-presentation`: proíbe `src/infrastructure/**` de importar `presentation`.
- `no-circular-dependencies`: proíbe ciclos entre módulos.

## Consequências

- **Positivas:** Domínio 100% testável em isolamento e rápido (~150ms para toda a suíte); contratos claros para novos contribuidores; falhas arquiteturais são barradas automaticamente no CI.
- **Trade-off:** Mantivemos fachadas leves (`src/map.js`, `src/entities.js`, `src/renderer.js`, `src/audio.js`) na raiz de `src/` para preservar compatibilidade retroativa com importadores existentes sem duplicar lógica.
