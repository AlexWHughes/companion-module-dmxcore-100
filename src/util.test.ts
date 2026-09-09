import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatPercent, percentToLevel } from './util.js'

void test('converts percent to a 0-1 level', () => {
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
