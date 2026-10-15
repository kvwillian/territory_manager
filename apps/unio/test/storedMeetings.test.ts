import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeMeetings, meetingFromDocument } from '../src/features/meetings/storedMeetings.ts'
import { alignIsoToWeekday, alignMeeting, congregationProfile, weekendDateFor, withWeekendMeetings, type CongregationMeeting } from '../src/domain/index.ts'

const local: CongregationMeeting = {
  id: 'midweek-2026-10-14',
  kind: 'midweek',
  isoDate: '2026-10-14',
  time: '19:30',
  status: 'draft',
  notes: '',
  sections: [],
  duties: [],
}

test('reads the congregation name, city, and state', () => {
  assert.deepEqual(
    congregationProfile({ name: 'Guaíba', city: 'Guaíba', state: 'RS', country: 'Brasil' }),
    { name: 'Guaíba', place: 'Guaíba, RS, Brasil' },
  )
  assert.deepEqual(congregationProfile({ name: 'Norte', city: 'Porto Alegre', country: 'Brasil' }), {
    name: 'Norte',
    place: 'Porto Alegre, Brasil',
  })
  assert.equal(congregationProfile(undefined).name, 'Congregação')
})

test('reads a saved meeting program', () => {
  const meeting = meetingFromDocument('midweek_default_2026-12-02', {
    kind: 'midweek',
    isoDate: '2026-12-02',
    time: '19:30',
    status: 'draft',
    notes: '',
    sections: [{ title: 'Tesouros da Palavra de Deus', token: 'treasures', parts: [{ title: 'Joias espirituais', durationMinutes: 10 }] }],
    duties: [{ label: 'Presidente', people: [''] }],
  })
  assert.equal(meeting?.isoDate, '2026-12-02')
  assert.equal(meeting?.sections[0]?.parts[0]?.title, 'Joias espirituais')
  assert.equal(meetingFromDocument('bad', { kind: 'midweek' }), null)
})

test('puts midweek on Thursday and keeps the weekend on Sunday', () => {
  assert.equal(alignIsoToWeekday('2026-10-14', 4), '2026-10-15')
  assert.equal(alignIsoToWeekday('2026-10-18', 7), '2026-10-18')
  const aligned = alignMeeting(local, { midweekWeekday: 4, weekendWeekday: 7 })
  assert.equal(aligned.isoDate, '2026-10-15')
})

test('saved meetings replace the local copy of the same date', () => {
  const saved = meetingFromDocument('midweek_default_2026-10-14', {
    kind: 'midweek',
    isoDate: '2026-10-14',
    status: 'draft',
    sections: [],
    duties: [],
  })
  const december = meetingFromDocument('midweek_default_2026-12-02', {
    kind: 'midweek',
    isoDate: '2026-12-02',
    status: 'draft',
    sections: [],
    duties: [],
  })
  const merged = mergeMeetings([local], [saved!, december!])
  assert.deepEqual(merged.map((meeting) => meeting.id), ['midweek_default_2026-10-14', 'midweek_default_2026-12-02'])
})

test('creates the Sunday meeting for each Thursday meeting', () => {
  assert.equal(weekendDateFor('2026-10-15', 7), '2026-10-18')
  const meetings = withWeekendMeetings([local], { midweekWeekday: 4, weekendWeekday: 7, weekendTime: '10:00' })
  const weekend = meetings.find((meeting) => meeting.kind === 'weekend')
  assert.equal(weekend?.isoDate, '2026-10-18')
  assert.equal(weekend?.sections[0]?.parts.some((part) => part.title === 'Discurso público'), true)
})
