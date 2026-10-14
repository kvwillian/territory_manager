import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeMeetings, meetingFromDocument } from '../src/features/meetings/storedMeetings.ts'
import type { CongregationMeeting } from '../src/domain.ts'

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
