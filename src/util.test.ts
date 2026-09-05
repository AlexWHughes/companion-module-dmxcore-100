import assert from 'node:assert/strict'
import { test } from 'node:test'
import { controlVariableId, formatPercent, nextIdentifyState, parseCodeList, percentToLevel } from './util.js'

void test('converts percent to a 0-1 OSC level', () => {
	assert.equal(percentToLevel(0), 0)
	assert.equal(percentToLevel(50), 0.5)
	assert.equal(percentToLevel(100), 1)
	assert.equal(percentToLevel(150), 1)
	assert.equal(percentToLevel(-20), 0)
})

void test('formats levels as compact percents', () => {
	assert.equal(formatPercent(null), '')
	assert.equal(formatPercent(1), '100')
	assert.equal(formatPercent(0.255), '25.5')
})

void test('parses unique control codes', () => {
	assert.deepEqual(parseCodeList('DSP1, mix; DSP1\nZone A'), ['DSP1', 'mix', 'Zone A'])
	assert.deepEqual(parseCodeList('  '), [])
})

void test('builds stable control variable ids', () => {
	assert.equal(controlVariableId('DSP 1'), 'control_dsp_1')
	assert.equal(controlVariableId('Mix'), 'control_mix')
})

void test('identify modes cover on, off, and toggle', () => {
	assert.equal(nextIdentifyState('on', false), true)
	assert.equal(nextIdentifyState('off', true), false)
	assert.equal(nextIdentifyState('toggle', true), false)
	assert.equal(nextIdentifyState('toggle', false), true)
})
