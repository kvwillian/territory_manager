import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CongregationMeeting } from '../src/domain/types.ts'
import { audioInWeek, cleaningInWeek, elderlyInWeek, greeting, publisherSummary, upcomingMeetings, weekBounds } from '../src/features/home/summary.ts'

const meeting = (isoDate: string, kind: CongregationMeeting['kind'] = 'midweek'): CongregationMeeting => ({
  id: `${kind}_${isoDate}`,
  kind,
  isoDate,
  time: '19:30',
  status: 'published',
  notes: '',
  sections: [],
  duties: [],
})

test('greets by the hour and lists only upcoming meetings', () => {
  assert.equal(greeting(9), 'Bom dia')
  assert.equal(greeting(15), 'Boa tarde')
  assert.equal(greeting(20), 'Boa noite')
  const next = upcomingMeetings([meeting('2026-10-14'), meeting('2026-10-18', 'weekend'), meeting('2026-10-10')], '2026-10-15')
  assert.deepEqual(next.map((item) => item.isoDate), ['2026-10-18'])
})

test('counts active publishers without inventing categories', () => {
  const summary = publisherSummary([
    { status: 'active', privilege: 'elder', pioneer: 'none' },
    { status: 'active', privilege: 'publisher', pioneer: 'regular' },
    { status: 'inactive', privilege: 'ministerialServant', pioneer: 'auxiliary' },
  ], 2)
  assert.deepEqual(summary, { active: 2, groups: 2, privileged: 1, pioneers: 1 })
})

test('reads only the week assignments that were stored', () => {
  const bounds = weekBounds(new Date(2026, 9, 15))
  assert.equal(bounds.from, '2026-10-12')
  assert.equal(bounds.to, '2026-10-18')
  assert.equal(audioInWeek([{ year: 2026, month: 10, rows: [{ day: 20, attendants: ['Ana'], microphones: [], sound: [] }] }], bounds.from, bounds.to), null)
  const hit = audioInWeek([{ year: 2026, month: 10, rows: [{ day: 15, attendants: ['Ana Silva'], microphones: [], sound: [] }] }], bounds.from, bounds.to)
  assert.equal(hit?.iso, '2026-10-15')
  assert.equal(elderlyInWeek([{ date: '2026-10-11', elderlyName: 'Fora', driverName: '' }], bounds.from, bounds.to), null)
  assert.equal(cleaningInWeek([meeting('2026-10-15')], { 'midweek_2026-10-15': 'Eduardo' }, bounds.from, bounds.to)?.name, 'Eduardo')
})
