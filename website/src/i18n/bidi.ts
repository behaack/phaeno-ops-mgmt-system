const LEFT_TO_RIGHT_ISOLATE = '\u2066'
const POP_DIRECTIONAL_ISOLATE = '\u2069'

/** Keeps embedded Latin text together when it appears inside an RTL message. */
export function isolateLtr(value: string) {
  return `${LEFT_TO_RIGHT_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`
}
