/**
 * Linguagem Ubíqua (Ubiquitous Language) do Domínio "A Fuga do Paçoca".
 * Centraliza os termos, estados, modos e constantes invariantes do negócio,
 * livres de acoplamento com infraestrutura (DOM, Canvas, WebAudio ou HTTP).
 */

export const BASE_SPEED = 210;
export const HUMAN_VISION_RANGE = 190;
export const MEGGIE_VISION_RANGE = HUMAN_VISION_RANGE / 2;
export const SPIKE_DOMAIN_RADIUS = MEGGIE_VISION_RANGE;
export const PEE_COOLDOWN_SECONDS = 5.0;

export const EstadoDaPartida = Object.freeze({
  EM_ANDAMENTO: 'playing',
  FUGA_CONCLUIDA: 'won',
  CAPTURADO_NO_COLO: 'captured',
  ENCHARCADO_DE_BANHO: 'soaked',
});

export const ModoDoHumano = Object.freeze({
  PATRULHA: 'patrol',
  REAGINDO: 'reacting',
  PERSEGUICAO: 'chase',
  INVESTIGACAO: 'investigate',
  GRITANDO: 'screaming',
  PIRUETA_DE_BALE: 'pirouette',
  MANOBRA_DE_SKATE: 'trick',
  DISTRAIDA: 'distracted',
  LIMPANDO_XIXI: 'cleaning_pee',
});

export const ModoDoCao = Object.freeze({
  DEITADO_EM_DOMINIO: 'sleeping',
  BRIGANDO_POR_TERRITORIO: 'fighting',
  RONDA_PELA_CASA: 'patrol',
  LATINDO_ALERTA: 'barking',
});

export const EventoSonoro = Object.freeze({
  BIP_CAMERA: 'camera_beep',
  GRITO_EMILY: 'emily_scream',
  CALL_TRABALHO: 'work_call',
  JATO_AGUA: 'splash',
  DISTRACAO: 'distraction',
  XIXI_NO_CHAO: 'pee',
  XIXI_BLOQUEADO: 'pee_blocked',
  BRIGA_SPIKE: 'dog_fight',
  LATIDO_MEGGIE: 'dog_bark',
  CAPTURADO: 'captured',
  PORTAO_ALCANCADO: 'win',
});

export const ZonaDeSaida = Object.freeze({
  GARAGEM: 'garage',
  QUINTAL_ESQUERDO: 'yard_left',
  QUINTAL_SUPERIOR: 'yard_top',
});
