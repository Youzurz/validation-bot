export type Decision = {
  id: string
  de: string
  titre: string
  question: string
  options: string[]
  cree: string
  reponse?: string
  repondu?: string
}

declare module 'claude-code' {
  interface PluginState {
    'validation-bot': { decisions: Shaped<Decision[]> }
  }
}
