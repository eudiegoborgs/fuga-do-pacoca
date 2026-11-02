/**
 * Regras de Governança Arquitetural (SOLID + DDD Layered / Clean Architecture).
 * Público-alvo: Desenvolvedores e pipeline de CI para garantir que o Domínio permaneça puro
 * e que não surjam dependências circulares ou acoplamentos invertidos entre camadas.
 *
 * Camadas:
 * 1. `src/domain/**`         -> Camada mais interna (Pura). Não pode importar `application`, `infrastructure` ou `presentation`.
 * 2. `src/application/**`    -> Casos de Uso e Portas. Só pode importar `domain` e `application`.
 * 3. `src/infrastructure/**` -> Adaptadores externos (WebAudio, Storage, HTTP). Não pode importar `presentation`.
 * 4. `src/presentation/**`   -> UI/DOM e Renderização Canvas 2D.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      comment: 'Dependências circulares violam a coesão e dificultam testes isolados.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'domain-must-remain-pure',
      severity: 'error',
      comment:
        'A camada de Domínio (DDD) contém apenas Linguagem Ubíqua, Entidades e Regras de Negócio puras. Nunca deve depender de Application, Infrastructure ou Presentation.',
      from: {
        path: '^src/domain/',
      },
      to: {
        path: '^src/(application|infrastructure|presentation)/',
      },
    },
    {
      name: 'application-must-not-depend-on-outer-layers',
      severity: 'error',
      comment:
        'A camada de Aplicação (Casos de Uso e Portas) depende apenas do Domínio, nunca de Infraestrutura ou Apresentação (Princípio da Inversão de Dependência - DIP).',
      from: {
        path: '^src/application/',
      },
      to: {
        path: '^src/(infrastructure|presentation)/',
      },
    },
    {
      name: 'infrastructure-must-not-depend-on-presentation',
      severity: 'error',
      comment:
        'Adaptadores de Infraestrutura (Áudio, Persistência) não devem conhecer detalhes da camada de Apresentação (Canvas/DOM).',
      from: {
        path: '^src/infrastructure/',
      },
      to: {
        path: '^src/presentation/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
