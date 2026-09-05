import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyOscMessage, createInitialState, isCuePlaying, variableValuesFromState } from './state.js'

void test('applies playback and master feedback', () => {
	const state = createInitialState()
	applyOscMessage(state, { address: '/dmxcore/status/text', args: [{ type: 's', value: "Playing 'ACT1'" }] })
	applyOscMessage(state, { address: '/dmxcore/status/cue', args: [{ type: 's', value: 'ACT1' }] })
	applyOscMessage(state, { address: '/dmxcore/dimmer/master', args: [{ type: 'f', value: 0.4 }] })
	applyOscMessage(state, { address: '/dmxcore/control/DSP1', args: [{ type: 'f', value: 0.8 }] })

	assert.equal(state.statusText, "Playing 'ACT1'")
	assert.equal(state.playingCue, 'ACT1')
	assert.equal(state.master, 0.4)
	assert.equal(state.controlValues['dsp1'], 0.8)
	assert.equal(isCuePlaying(state, 'ACT1'), true)
	assert.equal(isCuePlaying(state, 'OTHER'), false)
	assert.equal(isCuePlaying(state, ''), true)
})

void test('exposes control values as variables', () => {
	const state = createInitialState()
	state.controlValues['dsp1'] = 0.25
	const values = variableValuesFromState(state, ['DSP1'])
	assert.equal(values.control_dsp1, '25')
})
