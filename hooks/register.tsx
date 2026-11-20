import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionCost, SessionRateLimit } from 'claude-code'

import type { Meter } from '../types'

const meter = atom({ plugin: 'usage-meter', key: 'meter' } as const, null)
const isCollapsed = atom({ plugin: 'usage-meter', key: 'isCollapsed' } as const, false)

const LABELS: Record<string, string> = {
  five_hour: '5 小時',
  seven_day: '7 天',
  spend_limit: '花費上限',
}

type Usage = { context: SessionContextUsage; rateLimits: SessionRateLimit[]; cost?: SessionCost }

const toMeter = (u: Usage): Meter => ({
  limits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
  contextPercent: u.context.percent ?? null,
  contextTokens: u.context.tokens ?? null,
  contextWindow: u.context.window,
  usd: u.cost?.usd ?? null,
})

const colorFor = (p: number) => (p >= 90 ? 'error' : p >= 70 ? 'warning' : 'success')

const resetText = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  const ms = Date.parse(iso) - now
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} 分後重置`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours} 時 ${mins % 60} 分後重置`
  return `${Math.round(hours / 24)} 天後重置`
}

const fmtTokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const u = await $.session.usage()
    await update($, meter, () => toMeter(u))
    $.command.register({ name: 'usage-meter', description: '展開或收合用量表' })
    return result
  })

  on('session.measure', async ($, e, next) => {
    await update($, meter, () => toMeter(e))
    const hot = e.rateLimits.find(r => r.percentUsed >= 90)
    if (hot && e.changed.includes('rateLimits')) {
      $.ui.toast(`用量警告：${LABELS[hot.kind] ?? hot.kind} 額度已用 ${hot.percentUsed}%`)
    }
    return next(e)
  })

  on('command.run', { command: 'usage-meter' }, async ($, e) => {
    const was = await read($, isCollapsed)
    await update($, isCollapsed, () => !was)
    const u = await $.session.usage()
    await update($, meter, () => toMeter(u))
    return { text: was ? '用量表已展開' : '用量表已收合' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const m = await read($, meter)
    if (m === null) return next(e)
    const collapsed = await read($, isCollapsed)
    const now = await $.clock.now()
    const { Box, Text, Button } = $.ui.resolve(e)

    const bar = (key: string, label: string, pct: number, note: string) => {
      const p = Math.max(0, Math.min(100, pct))
      return (
        <Box key={key} flexDirection="row" alignItems="center" gap={1}>
          <Box width={8}>
            <Text dimColor>{label}</Text>
          </Box>
          <Box flexDirection="row" width={20} height={1} backgroundColor="subtle">
            <Box width={`${p}%`} height={1} backgroundColor={colorFor(p)} />
          </Box>
          <Text color={colorFor(p)}>{`${pct}%`}</Text>
          {note ? <Text dimColor>{note}</Text> : null}
        </Box>
      )
    }

    if (collapsed) {
      const top = Math.max(0, ...m.limits.map(l => l.percentUsed), m.contextPercent ?? 0)
      return (
        <Box flexDirection="row" gap={1}>
          <Text dimColor>{`用量 ${top}%`}</Text>
          <Button key="expand" label="展開" onPress={() => update($, isCollapsed, () => false)} />
        </Box>
      )
    }

    const rows = m.limits.map(l =>
      bar(l.kind, LABELS[l.kind] ?? l.kind, l.percentUsed, resetText(l.resetsAt, now)),
    )
    if (m.contextPercent !== null) {
      const note = m.contextTokens !== null ? `${fmtTokens(m.contextTokens)} / ${fmtTokens(m.contextWindow)}` : ''
      rows.push(bar('context', '上下文', m.contextPercent, note))
    }

    return (
      <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="subtle">
        <Box flexDirection="row" justifyContent="space-between" gap={1}>
          <Text bold>用量表</Text>
          <Box flexDirection="row" gap={1}>
            {m.usd !== null ? <Text dimColor>{`本次估計 $${m.usd.toFixed(2)}（非帳單）`}</Text> : null}
            <Button key="collapse" label="收合" onPress={() => update($, isCollapsed, () => true)} />
          </Box>
        </Box>
        {rows.length > 0 ? rows : <Text dimColor>尚無額度資料，送出下一則訊息後會顯示</Text>}
      </Box>
    )
  })
}
