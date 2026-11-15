import { atom, read, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

import type { Decision } from '../types'

type Engine = Parameters<Hook<'session.start'>>[0]

// Boîte de décisions de Guillaume.
// Chaque agent (Claude, Codex, AGY) dépose une question dans DIR, un fichier
// JSON par question. Un clic ici écrit la réponse dans ce même fichier, que
// l'agent relit. Aucun message entre agents : le dossier est le canal.
const DIR = '/Volumes/COMET/ULT/GOV/DECISIONS'
const JOURNAL = `${DIR}/JOURNAL.md`
const PANE = 'validation-bot'
const TITRE = 'Décisions'

// Change the tag when the shape of a decision changes: it declines what an earlier version stored.
const decisions = atom({ plugin: 'validation-bot', key: 'decisions' } as const, [], {
  shape: 'decisions-1',
})

const estDecision = (v: unknown): v is Decision => {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>

  return (
    typeof d.id === 'string' &&
    typeof d.titre === 'string' &&
    typeof d.question === 'string' &&
    Array.isArray(d.options)
  )
}

const lire = async ($: Engine, name: string): Promise<Decision | undefined> => {
  try {
    const v: unknown = JSON.parse(await $.fs.read(`${DIR}/${name}`))
    if (!estDecision(v)) return undefined

    return {
      ...v,
      de: typeof v.de === 'string' ? v.de : '?',
      cree: typeof v.cree === 'string' ? v.cree : '',
      options: v.options.filter((o): o is string => typeof o === 'string'),
    }
  } catch {
    return undefined
  }
}

const charger = async ($: Engine): Promise<void> => {
  const entries = await $.fs.list(DIR).catch(() => [])
  const names = entries
    .filter(en => en.kind === 'file' && en.name.endsWith('.json'))
    .map(en => en.name)
  const lues = await Promise.all(names.map(n => lire($, n)))
  const list = lues
    .filter((d): d is Decision => d !== undefined)
    .sort((a, b) => a.cree.localeCompare(b.cree) || a.id.localeCompare(b.id))
  const prev = await read($, decisions)
  if (JSON.stringify(prev) !== JSON.stringify(list)) await update($, decisions, () => list)
  const attente = list.filter(d => d.reponse === undefined).length
  $.ui.status(attente > 0 ? `${attente} décision(s) à prendre` : undefined)
}

const repondre = async ($: Engine, d: Decision, reponse: string): Promise<void> => {
  const texte = reponse.trim()
  if (texte === '') return
  const repondu = new Date(await $.clock.now()).toISOString()
  // Relire avant d'écrire : l'agent a pu compléter sa question entre-temps.
  const courant = (await lire($, `${d.id}.json`)) ?? d
  await $.fs.write(
    `${DIR}/${d.id}.json`,
    `${JSON.stringify({ ...courant, reponse: texte, repondu }, null, 2)}\n`,
  )
  const avant = await $.fs.read(JOURNAL).catch(() => '# Journal des décisions de Guillaume\n\n')
  await $.fs.write(JOURNAL, `${avant}- ${repondu} — ${d.de} — ${d.titre} — **${texte}**\n`)
  await charger($)
  $.ui.toast(`Répondu : ${texte}`)
}

const rouvrir = async ($: Engine, d: Decision): Promise<void> => {
  const courant = (await lire($, `${d.id}.json`)) ?? d
  const { reponse: _r, repondu: _d, ...reste } = courant
  await $.fs.write(`${DIR}/${d.id}.json`, `${JSON.stringify(reste, null, 2)}\n`)
  const avant = await $.fs.read(JOURNAL).catch(() => '')
  const quand = new Date(await $.clock.now()).toISOString()
  await $.fs.write(JOURNAL, `${avant}- ${quand} — ${d.de} — ${d.titre} — réponse retirée\n`)
  await charger($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'validation-bot',
      description: 'Ouvre la boîte de décisions (questions des agents en attente)',
    })
    void $.ui.open({ id: PANE, title: TITRE })
    await charger($).catch(() => undefined)
    $.clock.every(5000, () => void charger($).catch(() => undefined))

    return next(e)
  })

  on('command.run', { command: 'validation-bot' }, async $ => {
    await $.ui.open({ id: PANE, title: TITRE })
    await charger($)

    return { text: 'Boîte de décisions ouverte.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const list = await read($, decisions)
    const attente = list.filter(d => d.reponse === undefined)
    const faites = list
      .filter(d => d.reponse !== undefined)
      .sort((a, b) => (b.repondu ?? '').localeCompare(a.repondu ?? ''))
      .slice(0, 8)

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>
          {attente.length === 0
            ? 'Aucune décision en attente'
            : `${attente.length} décision(s) à prendre`}
        </Text>
        {attente.map(d => (
          <Box key={d.id} flexDirection="column">
            <Text bold>{d.titre}</Text>
            <Text dimColor>{`${d.de} · ${d.cree.slice(0, 16).replace('T', ' ')}`}</Text>
            <Text>{d.question}</Text>
            <Box flexDirection="column">
              {d.options.map((o, i) => (
                <Button
                  key={`${d.id}-${i}`}
                  variant={i === 0 ? 'primary' : 'secondary'}
                  onPress={() => void repondre($, d, o)}
                >
                  {o}
                </Button>
              ))}
            </Box>
            <Input
              key={`${d.id}-autre`}
              placeholder="Autre réponse, puis Entrée"
              submitLabel="répondre"
              onSubmit={value => void repondre($, d, value)}
            />
          </Box>
        ))}
        {faites.length > 0 && <Text bold>Dernières réponses</Text>}
        {faites.map(d => (
          <Box key={`f-${d.id}`} flexDirection="column">
            <Text dimColor>{`${d.de} · ${d.titre}`}</Text>
            <Text>{`→ ${d.reponse ?? ''}`}</Text>
            <Button variant="secondary" onPress={() => void rouvrir($, d)}>
              Changer ma réponse
            </Button>
          </Box>
        ))}
      </Box>
    )
  })
}
