import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	confirmOptimisticSetLevel,
	confirmOptimisticSetLevels,
	takeAllOptimisticRollbacks,
	takeOptimisticRollback,
	trackOptimisticSetLevel,
	type PendingOptimisticLevels,
} from './optimistic.js'
import { applyStates, createInitialState, getLevel } from './state.js'

void test('tracks first prior level across rapid optimistic ticks', () => {
	const pending: PendingOptimisticLevels = new Map()
	trackOptimisticSetLevel(pending, 'system.masterdimmer', 0.5)
	trackOptimisticSetLevel(pending, 'system.masterdimmer', 0.55)
	trackOptimisticSetLevel(pending, 'system.masterdimmer', 0.6)

	assert.equal(pending.get('system.masterdimmer'), 0.5)
	assert.equal(takeOptimisticRollback(pending, 'system.masterdimmer'), 0.5)
	assert.equal(takeOptimisticRollback(pending, 'system.masterdimmer'), undefined)
})

void test('device state confirmation clears pending optimistic level', () => {
	const pending: PendingOptimisticLevels = new Map()
	trackOptimisticSetLevel(pending, 'system.volume', 0.2)
	confirmOptimisticSetLevel(pending, 'system.volume')
	assert.equal(takeOptimisticRollback(pending, 'system.volume'), undefined)
})

void test('rejection restores prior level in module state', () => {
	const state = createInitialState()
	applyStates(state, [{ code: 'system.masterdimmer', level: 0.4 }], true)

	const pending: PendingOptimisticLevels = new Map()
	const prior = getLevel(state, 'system.masterdimmer')
	trackOptimisticSetLevel(pending, 'system.masterdimmer', prior)
	applyStates(state, [{ code: 'system.masterdimmer', level: 0.9 }], false)
	assert.equal(getLevel(state, 'system.masterdimmer'), 0.9)

	const rollback = takeOptimisticRollback(pending, 'system.masterdimmer')
	assert.equal(rollback, 0.4)
	if (typeof rollback === 'number') {
		applyStates(state, [{ code: 'system.masterdimmer', level: rollback }], false)
	}
	assert.equal(getLevel(state, 'system.masterdimmer'), 0.4)
})

void test('unknown prior on rejection signals refresh instead of inventing a level', () => {
	const pending: PendingOptimisticLevels = new Map()
	trackOptimisticSetLevel(pending, 'zone.BAR', null)
	assert.equal(takeOptimisticRollback(pending, 'zone.BAR'), null)
})

void test('lost commands roll back all pending levels then allow reconciliation', () => {
	const state = createInitialState()
	applyStates(
		state,
		[
			{ code: 'system.masterdimmer', level: 0.5 },
			{ code: 'system.volume', level: 0.25 },
		],
		true,
	)

	const pending: PendingOptimisticLevels = new Map()
	trackOptimisticSetLevel(pending, 'system.masterdimmer', getLevel(state, 'system.masterdimmer'))
	trackOptimisticSetLevel(pending, 'system.volume', getLevel(state, 'system.volume'))
	applyStates(
		state,
		[
			{ code: 'system.masterdimmer', level: 0.8 },
			{ code: 'system.volume', level: 0.9 },
		],
		false,
	)

	const rollbacks = takeAllOptimisticRollbacks(pending)
	assert.deepEqual(rollbacks, [
		{ code: 'system.masterdimmer', priorLevel: 0.5 },
		{ code: 'system.volume', priorLevel: 0.25 },
	])
	for (const { code, priorLevel } of rollbacks) {
		if (typeof priorLevel === 'number') {
			applyStates(state, [{ code, level: priorLevel }], false)
		}
	}

	assert.equal(getLevel(state, 'system.masterdimmer'), 0.5)
	assert.equal(getLevel(state, 'system.volume'), 0.25)
	assert.equal(pending.size, 0)

	// After reconciliation, a fresh tick can track again from the restored baseline.
	trackOptimisticSetLevel(pending, 'system.masterdimmer', getLevel(state, 'system.masterdimmer'))
	applyStates(state, [{ code: 'system.masterdimmer', level: 0.55 }], false)
	confirmOptimisticSetLevels(pending, ['system.masterdimmer'])
	assert.equal(takeOptimisticRollback(pending, 'system.masterdimmer'), undefined)
	assert.equal(getLevel(state, 'system.masterdimmer'), 0.55)
})
