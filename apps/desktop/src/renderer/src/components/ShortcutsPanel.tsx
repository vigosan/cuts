import { useEffect, useEffectEvent } from 'react'
import { t } from '../i18n'
import { CloseIcon } from './icons'

type Modifier = 'alt' | 'shift' | 'mod'
type Combo = { key: string; with?: Modifier[] }
type Label = Exclude<keyof typeof t.shortcuts, 'title' | 'mark' | 'play' | 'clips' | 'file' | 'space' | 'drag'>
type Group = { title: 'mark' | 'play' | 'clips' | 'file'; items: { label: Label; combos: Combo[] }[] }

const GROUPS: Group[] = [
  {
    title: 'mark',
    items: [
      { label: 'markStart', combos: [{ key: 'I' }] },
      { label: 'markEnd', combos: [{ key: 'O' }] },
      { label: 'markFree', combos: [{ key: 'I', with: ['alt'] }, { key: 'O', with: ['alt'] }] },
      { label: 'split', combos: [{ key: 'S' }] }
    ]
  },
  {
    title: 'play',
    items: [
      { label: 'playPause', combos: [{ key: t.shortcuts.space }] },
      { label: 'seek', combos: [{ key: '←' }, { key: '→' }] },
      { label: 'frame', combos: [{ key: ',' }, { key: '.' }] },
      { label: 'second', combos: [{ key: ',', with: ['shift'] }, { key: '.', with: ['shift'] }] },
      { label: 'shuttle', combos: [{ key: 'J' }, { key: 'K' }, { key: 'L' }] }
    ]
  },
  {
    title: 'clips',
    items: [
      { label: 'reorder', combos: [{ key: '↑', with: ['alt'] }, { key: '↓', with: ['alt'] }] },
      { label: 'dragFree', combos: [{ key: t.shortcuts.drag, with: ['alt'] }] },
      { label: 'undo', combos: [{ key: 'Z', with: ['mod'] }] },
      { label: 'redo', combos: [{ key: 'Z', with: ['shift', 'mod'] }] }
    ]
  },
  {
    title: 'file',
    items: [
      { label: 'open', combos: [{ key: 'O', with: ['mod'] }] },
      { label: 'exportFrame', combos: [{ key: 'E', with: ['shift', 'mod'] }] },
      { label: 'show', combos: [{ key: '?' }] }
    ]
  }
]

const MAC_ORDER: Modifier[] = ['alt', 'shift', 'mod']
const MAC_SYMBOLS: Record<Modifier, string> = { alt: '⌥', shift: '⇧', mod: '⌘' }
const PC_ORDER: Modifier[] = ['mod', 'shift', 'alt']
const PC_NAMES: Record<Modifier, string> = { mod: 'Ctrl', shift: 'Shift', alt: 'Alt' }

function comboText(combo: Combo, mac: boolean): string {
  const held = combo.with ?? []
  if (!mac) return [...PC_ORDER.filter((m) => held.includes(m)).map((m) => PC_NAMES[m]), combo.key].join('+')
  const symbols = MAC_ORDER.filter((m) => held.includes(m)).map((m) => MAC_SYMBOLS[m]).join('')
  return combo.key.length > 1 && symbols ? `${symbols} ${combo.key}` : symbols + combo.key
}

export function ShortcutsPanel({ platform, onClose }: { platform: NodeJS.Platform; onClose: () => void }) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === '?') onClose()
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const mac = platform === 'darwin'
  return (
    <div
      data-testid="shortcuts-backdrop"
      className="fixed inset-0 z-20 grid place-items-center bg-black/30 p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        data-testid="shortcuts"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="max-h-full w-full max-w-2xl overflow-auto rounded-2xl bg-surface p-6 shadow-lg ring-1 ring-ink-3/20"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-base font-medium text-ink">
            {t.shortcuts.title}
          </h2>
          <button
            data-testid="close-shortcuts"
            className="grid size-7 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            title={t.close}
            aria-label={t.close}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">{t.shortcuts[group.title]}</h3>
              <dl className="flex flex-col gap-1.5 text-sm">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <dt className="text-ink-2">{t.shortcuts[item.label]}</dt>
                    <dd className="flex shrink-0 gap-1">
                      {item.combos.map((combo) => (
                        <kbd
                          key={comboText(combo, mac)}
                          className="rounded bg-sunken px-1.5 py-0.5 font-sans text-xs text-ink tabular-nums"
                        >
                          {comboText(combo, mac)}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
