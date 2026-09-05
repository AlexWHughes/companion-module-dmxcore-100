import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	decodeOscPacket,
	encodeOscMessage,
	flattenOscPackets,
	isOscBundle,
	numericArg,
	OscAddress,
	parseControlFeedbackAddress,
	stringArg,
} from './osc.js'

void test('encodes and decodes a float message', () => {
	const encoded = encodeOscMessage('/dmxcore/dimmer/master', [{ type: 'f', value: 0.5 }])
	const decoded = decodeOscPacket(encoded)
	assert.equal(isOscBundle(decoded), false)
	if (isOscBundle(decoded)) return
	assert.equal(decoded.address, '/dmxcore/dimmer/master')
	assert.equal(decoded.args[0]?.type, 'f')
	assert.ok(Math.abs(Number(decoded.args[0]?.value) - 0.5) < 0.0001)
})

void test('encodes integer and string arguments', () => {
	const encoded = encodeOscMessage('/dmxcore/cue/ACT1', [
		{ type: 'i', value: 3 },
		{ type: 's', value: 'hello' },
	])
	const decoded = decodeOscPacket(encoded)
	assert.equal(isOscBundle(decoded), false)
	if (isOscBundle(decoded)) return
	assert.equal(numericArg(decoded.args, 0), 3)
	assert.equal(stringArg(decoded.args, 1), 'hello')
})

void test('pads long addresses to 4-byte boundaries', () => {
	const encoded = encodeOscMessage('/dmxcore/cue/ACT1', [])
	assert.equal(encoded.length % 4, 0)
	const decoded = decodeOscPacket(encoded)
	assert.equal(isOscBundle(decoded), false)
	if (isOscBundle(decoded)) return
	assert.equal(decoded.address, '/dmxcore/cue/ACT1')
	assert.equal(decoded.args.length, 0)
})

void test('rejects addresses that do not start with a slash', () => {
	assert.throws(() => encodeOscMessage('dmxcore/cue/ACT1'), /must start with \//)
})

void test('builds built-in DMX Core addresses', () => {
	assert.equal(OscAddress.cue('ACT1'), '/dmxcore/cue/ACT1')
	assert.equal(OscAddress.preset('P1'), '/dmxcore/preset/P1')
	assert.equal(OscAddress.zone('Z1'), '/dmxcore/dimmer/zone/Z1')
	assert.equal(OscAddress.fixture('F1', 'white'), '/dmxcore/fixture/F1/white')
	assert.equal(OscAddress.effectNone, '/dmxcore/effect/none')
	assert.equal(OscAddress.ping, '/ping')
})

void test('parses control-value feedback addresses case-insensitively', () => {
	assert.equal(parseControlFeedbackAddress('/dmxcore/control/DSP1'), 'DSP1')
	assert.equal(parseControlFeedbackAddress('/DMXCORE/control/mix'), 'mix')
	assert.equal(parseControlFeedbackAddress('/dmxcore/dimmer/master'), undefined)
})

void test('flattens an OSC bundle of status messages', () => {
	const msgA = encodeOscMessage('/dmxcore/status/text', [{ type: 's', value: "Playing 'ACT1'" }])
	const msgB = encodeOscMessage('/dmxcore/status/cue', [{ type: 's', value: 'ACT1' }])
	const bundle = Buffer.concat([padded('#bundle'), Buffer.alloc(8), int32(msgA.length), msgA, int32(msgB.length), msgB])

	const messages = flattenOscPackets(decodeOscPacket(bundle))
	assert.equal(messages.length, 2)
	assert.equal(stringArg(messages[0]?.args), "Playing 'ACT1'")
	assert.equal(stringArg(messages[1]?.args), 'ACT1')
})

function padded(value: string): Buffer {
	const body = Buffer.from(value, 'utf8')
	const pad = (4 - ((body.length + 1) % 4)) % 4
	return Buffer.concat([body, Buffer.alloc(1 + pad)])
}

function int32(value: number): Buffer {
	const buf = Buffer.alloc(4)
	buf.writeInt32BE(value, 0)
	return buf
}
