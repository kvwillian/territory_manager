import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addRosterDay, assignSlot, emptyRoster, removeRosterDay, rosterRowsForMeetings } from '../src/features/audio-video/roster.ts'
import { ensureMeetingRows } from '../src/features/elderly-support/model.ts'
import { qualifiesFor } from '../src/features/audio-video/publishers.ts'

test('assigns a publisher into one cell slot', () => {
  const roster = addRosterDay(emptyRoster(2026, 10), 15)
  const next = assignSlot(roster, 15, 'microphones', 1, 'Júlio César Oliveira')
  assert.deepEqual(next.rows[0].microphones, ['', 'Júlio César Oliveira'])
  assert.deepEqual(next.rows[0].attendants, ['', ''])
})

test('adds a meeting day once and keeps the month in order', () => {
  const first = addRosterDay(emptyRoster(2026, 10), 18)
  const second = addRosterDay(addRosterDay(first, 4), 18)
  assert.deepEqual(second.rows.map((row) => row.day), [4, 18])
})

test('maps audio and video privileges to the three columns', () => {
  const indicador = { indicador: true, microfone: false, som: false }
  const microfone = { indicador: false, microfone: true, som: false }
  const som = { indicador: false, microfone: false, som: true }
  const both = { indicador: true, microfone: true, som: true }
  assert.equal(qualifiesFor(indicador, 'attendants'), true)
  assert.equal(qualifiesFor(indicador, 'microphones'), false)
  assert.equal(qualifiesFor(indicador, 'sound'), false)
  assert.equal(qualifiesFor(microfone, 'microphones'), true)
  assert.equal(qualifiesFor(microfone, 'sound'), false)
  assert.equal(qualifiesFor(som, 'microphones'), true)
  assert.equal(qualifiesFor(som, 'sound'), true)
  assert.equal(qualifiesFor(som, 'attendants'), false)
  assert.equal(qualifiesFor(both, 'attendants'), true)
  assert.equal(qualifiesFor(both, 'microphones'), true)
  assert.equal(qualifiesFor(both, 'sound'), true)
})
test('uses registered meeting dates and keeps an excluded day hidden', () => {
  const roster = emptyRoster(2026, 12)
  const shown = rosterRowsForMeetings(roster, ['2026-12-02', '2026-12-06', '2026-12-27'])
  assert.deepEqual(shown.map((row) => row.day), [2, 6, 27])
  const hidden = rosterRowsForMeetings(removeRosterDay(roster, 6), ['2026-12-02', '2026-12-06'])
  assert.deepEqual(hidden.map((row) => row.day), [2])
})

test('adds meeting dates that are missing from the elderly schedule', () => {
  const rows = ensureMeetingRows(
    [{ key: 'saved-0000', date: '2026-12-02', elderlyName: 'Ana', driverName: 'Carlos' }],
    ['2026-12-02', '2026-12-06'],
  )
  assert.deepEqual(rows.map((row) => row.date), ['2026-12-02', '2026-12-06'])
  assert.equal(rows[0].elderlyName, 'Ana')
  assert.equal(rows[1].elderlyName, '')
})
test('removes one meeting day and leaves the others', () => {
  const roster = addRosterDay(addRosterDay(emptyRoster(2026, 10), 4), 18)
  const next = removeRosterDay(roster, 4)
  assert.deepEqual(next.rows.map((row) => row.day), [18])
  assert.equal(removeRosterDay(next, 4), next)
})

test('ignores a day outside the month', () => {
  const roster = emptyRoster(2026, 10)
  assert.equal(addRosterDay(roster, 0), roster)
  assert.equal(addRosterDay(roster, 32), roster)
})
