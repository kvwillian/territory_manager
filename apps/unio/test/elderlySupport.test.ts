import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignPerson,
  avatarTone,
  canManageElderlySupport,
  displayDate,
  groupByDate,
  initials,
  missingNames,
  monthBounds,
  monthStats,
  toStoredAssignments,
  weekdayLabel,
  type AssignmentRow,
} from '../src/features/elderly-support/model.ts'

const rows: AssignmentRow[] = [
  { key: 'a', date: '2026-10-11', elderlyName: 'Solange', driverName: 'Kevin' },
  { key: 'b', date: '2026-10-11', elderlyName: 'Luzeni', driverName: '' },
  { key: 'c', date: '2026-10-15', elderlyName: 'M. Socorro', elderlyPublisherId: 'pub-1', driverName: 'Claudemir Bessa', driverPublisherId: 'pub-2' },
  { key: 'd', date: '2026-11-01', elderlyName: 'Irineu', driverName: 'Oldair' },
]

test('builds the month summary from the design', () => {
  assert.deepEqual(monthBounds('2026-10'), { from: '2026-10-01', to: '2026-10-31' })
  assert.equal(weekdayLabel('2026-10-11'), 'Domingo')
  assert.equal(weekdayLabel('2026-10-15'), 'Quinta')
  assert.equal(displayDate('2026-10-11'), '11/10/2026')
  assert.equal(initials('Solange'), 'SO')
  assert.equal(initials('M. Socorro'), 'MS')
  assert.equal(initials('Júlio César'), 'JC')
  assert.equal(initials(''), '')
  assert.deepEqual(monthStats(rows.filter((row) => row.date.startsWith('2026-10'))), {
    meetings: 2,
    elderly: 3,
    drivers: 2,
  })
  assert.deepEqual(
    groupByDate(rows.filter((row) => row.date.startsWith('2026-10'))).map((group) => group.date),
    ['2026-10-11', '2026-10-15'],
  )
  assert.equal(avatarTone('Solange').fg.length > 0, true)
})

test('keeps a typed name and drops the publisher when the driver is cleared', () => {
  const linked = assignPerson(rows[0], 'elderly', { name: 'Solange', publisherId: 'pub-solange' })
  assert.equal(linked.elderlyPublisherId, 'pub-solange')
  const custom = assignPerson(linked, 'driver', { name: 'Kevin da esquina' })
  assert.equal(custom.driverName, 'Kevin da esquina')
  assert.equal(custom.driverPublisherId, undefined)
  const cleared = assignPerson(rows[2], 'driver', { name: '' })
  assert.equal(cleared.driverName, '')
  assert.equal(cleared.driverPublisherId, undefined)
  const stored = toStoredAssignments([custom, cleared, rows[3]])
  assert.equal(stored[0].driverPublisherId, undefined)
  assert.equal(stored[1].driverName, '')
  assert.equal(stored[1].elderlyPublisherId, 'pub-1')
  assert.equal(stored[1].driverPublisherId, undefined)
  assert.equal(stored[2].date, '2026-11-01')
})

test('blocks save while an elderly name is empty and respects module access', () => {
  assert.equal(missingNames([{ key: 'n', date: '2026-10-11', elderlyName: '  ', driverName: 'Kevin' }]), true)
  assert.equal(missingNames(rows), false)
  assert.equal(canManageElderlySupport({ role: 'admin', congregationId: 'default' }), true)
  assert.equal(canManageElderlySupport({ role: 'conductor', congregationId: 'default', manageFlags: ['meetings'] }), false)
  assert.equal(
    canManageElderlySupport({ role: 'conductor', congregationId: 'default', manageFlags: ['elderlySupport'] }),
    true,
  )
  assert.equal(canManageElderlySupport({ role: 'admin', congregationId: null }), false)
})
