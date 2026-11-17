import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  cleanImportedPersonName,
  DEFAULT_GROUPS_IMPORT_JSON,
  formatImportedGroupName,
  inferPublisherGender,
  parseGroupsImportJson,
} from '../src/features/publishers/importGroups.ts'

test('parses the default A-F groups JSON payload accurately', () => {
  const groups = parseGroupsImportJson(DEFAULT_GROUPS_IMPORT_JSON)
  assert.equal(groups.length, 6)
  assert.equal(groups[0]?.code, 'A')
  assert.equal(groups[0]?.name, 'Laranjeiras')
  assert.equal(groups[0]?.superintendent, 'Edilton Cusmão')
  assert.equal(groups[0]?.assistant, 'João Aristeu')
  assert.equal(groups[0]?.publishers.length, 20)
  assert.equal(groups[2]?.notes, 'Há nomes encobertos pelo reflexo entre Ana Beatriz e Zeni Ierich.')
})

test('formats group names with code prefix when enabled and strips trailing question marks', () => {
  const groups = parseGroupsImportJson(DEFAULT_GROUPS_IMPORT_JSON)
  assert.equal(formatImportedGroupName(groups[0]!, true), 'A — Laranjeiras')
  assert.equal(formatImportedGroupName(groups[0]!, false), 'Laranjeiras')
  assert.equal(cleanImportedPersonName('Lisandrela?', true), 'Lisandrela')
  assert.equal(cleanImportedPersonName('Lisandrela?', false), 'Lisandrela?')
  assert.equal(cleanImportedPersonName('Josel...?', true), 'Josel...')
})

test('infers publisher gender accurately for Brazilian names in the congregation list', () => {
  assert.equal(inferPublisherGender('Rosana Cusmão'), 'feminino')
  assert.equal(inferPublisherGender('Djalma Fidêncio'), 'masculino')
  assert.equal(inferPublisherGender('Dirce Fidêncio'), 'feminino')
  assert.equal(inferPublisherGender('Laucy Vieira'), 'masculino')
  assert.equal(inferPublisherGender('Sol'), 'feminino')
  assert.equal(inferPublisherGender('Carmem Silva'), 'feminino')
  assert.equal(inferPublisherGender('Lourdes Amaro'), 'feminino')
})
