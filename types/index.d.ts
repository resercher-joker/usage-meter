export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Meter = {
  limits: Limit[]
  contextPercent: number | null
  contextTokens: number | null
  contextWindow: number
  usd: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'usage-meter': { meter: Meter | null; isCollapsed: boolean }
  }
}
