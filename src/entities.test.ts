import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildBaseUrl, buildDeviceApiUrl, buildWsUrl } from './api.js'
import { entityVariableId, parseDeviceInfo, parseDeviceStatus, parseEntities, parseStates } from './entities.js'
import { applyStates, createInitialState, replaceCatalog, variableValuesFromState } from './state.js'
import { formatPercent, percentToLevel } from './util.js'

void test('builds Integration API URLs', () => {
	const config = { host: '10.0.0.5', port: 80, useHttps: false, allowInsecureTls: false }
	assert.equal(buildBaseUrl(config), 'http://10.0.0.5:80/api/integration/v1')
	assert.equal(buildWsUrl(config), 'ws://10.0.0.5:80/api/integration/v1/events')
	assert.equal(buildDeviceApiUrl(config, '/api/status'), 'http://10.0.0.5:80/api/status')

	const legacyDocsPort = { ...config, port: 8080 }
	assert.equal(buildBaseUrl(legacyDocsPort), 'http://10.0.0.5:8080/api/integration/v1')

	const tls = { ...config, useHttps: true, port: 443 }
	assert.equal(buildBaseUrl(tls), 'https://10.0.0.5:443/api/integration/v1')
	assert.equal(buildWsUrl(tls), 'wss://10.0.0.5:443/api/integration/v1/events')

	const ipv6 = { ...config, host: '2001:db8::1' }
	assert.equal(buildBaseUrl(ipv6), 'http://[2001:db8::1]:80/api/integration/v1')
	assert.equal(buildWsUrl(ipv6), 'ws://[2001:db8::1]:80/api/integration/v1/events')

	const ipv6Bracketed = { ...config, host: '[2001:db8::1]' }
	assert.equal(buildBaseUrl(ipv6Bracketed), 'http://[2001:db8::1]:80/api/integration/v1')
})

void test('parses catalog entities and rejects unknown kinds', () => {
	const entities = parseEntities({
		entities: [
			{ code: 'cue.INTRO', name: 'Intro', kind: 'scene' },
			{ code: 'preset.PARTY', name: 'Party', kind: 'switch' },
			{ code: 'system.masterdimmer', name: 'Master', kind: 'level' },
			{ code: 'bad', name: 'Bad', kind: 'nope' },
			{ code: '', name: 'Empty', kind: 'button' },
		],
	})

	assert.equal(entities.length, 3)
	assert.equal(entities[0]?.code, 'cue.INTRO')
	assert.equal(entities[1]?.kind, 'switch')
	assert.equal(entities[2]?.kind, 'level')
})

void test('parses device info and state frames', () => {
	const info = parseDeviceInfo({
		protocolVersion: 1,
		serial: 'ABC',
		productName: 'DMX Core 100',
		deviceName: 'FOH',
		softwareVersion: '2.0.0',
	})
	assert.equal(info?.protocolVersion, 1)
	assert.equal(info?.product, 'DMX Core 100')
	assert.equal(info?.deviceName, 'FOH')

	const status = parseDeviceStatus({
		hostName: '9a9dfde',
		deviceNickname: 'DMXCore 7"',
		appVersion: 'balena.2026.909.1',
		showName: 'Mandylights',
		sysCpuUsage: 65.1,
		cpuTemperatureC: 59.4,
		boardTemperatureC: 47.0,
		audioAvailable: true,
		playerName: null,
		recorder: 'INACTIVE',
	})
	assert.equal(status?.showName, 'Mandylights')
	assert.equal(status?.deviceNickname, 'DMXCore 7"')
	assert.equal(status?.cpuTemperatureC, 59.4)
	assert.equal(status?.playerName, '')
	assert.equal(status?.audioAvailable, true)

	const states = parseStates({
		states: [
			{ code: 'system.masterdimmer', level: 0.4 },
			{ code: 'preset.PARTY', isOn: true },
			{ code: 'system.nowplaying', text: 'Intro' },
		],
	})
	assert.equal(states.length, 3)
	assert.equal(states[0]?.level, 0.4)
	assert.equal(states[1]?.isOn, true)
	assert.equal(states[2]?.text, 'Intro')
})

void test('applies catalog and state into variables', () => {
	const state = createInitialState()
	state.info = {
		protocolVersion: 1,
		serial: 'ABC',
		product: 'DMX Core 100',
		deviceName: 'FOH',
		softwareVersion: '2.0.0',
	}
	state.status = {
		hostName: 'core-foh',
		deviceNickname: 'FOH Rack',
		appVersion: 'balena.2026.909.1',
		showName: 'Mandylights',
		sysCpuUsage: 10,
		appCpuUsage: 5,
		sysMemoryUsageMB: 900,
		sysMemoryTotalMB: 4000,
		appMemoryUsageMB: 700,
		storageUsageMB: 1000,
		storageTotalMB: 28000,
		cpuTemperatureC: 50.5,
		boardTemperatureC: 40,
		audioAvailable: true,
		networkSpeedMbit: 1000,
		playerName: '',
		playerCode: '',
		appUpTimeH: 2.5,
		sysUpTimeH: 10,
		recorder: 'INACTIVE',
	}
	state.connected = true

	replaceCatalog(state, [
		{ code: 'system.masterdimmer', name: 'Master', kind: 'level' },
		{ code: 'preset.PARTY', name: 'Party', kind: 'switch' },
		{ code: 'system.nowplaying', name: 'Now Playing', kind: 'sensor' },
		{ code: 'look.Mode', name: 'Mode', kind: 'select', choices: ['A', 'B'] },
	])

	applyStates(
		state,
		[
			{ code: 'system.masterdimmer', level: 0.25 },
			{ code: 'preset.PARTY', isOn: true },
			{ code: 'system.nowplaying', text: 'cue.INTRO' },
			{ code: 'look.Mode', choice: 'B' },
		],
		true,
	)

	const values = variableValuesFromState(state)
	assert.equal(values.device_name, 'FOH Rack')
	assert.equal(values.show_name, 'Mandylights')
	assert.equal(values.hostname, 'core-foh')
	assert.equal(values.cpu_temp_c, '50.5')
	assert.equal(values.connected, 'true')
	assert.equal(values.now_playing, 'cue.INTRO')
	assert.equal(values.master_percent, '25')
	assert.equal(values[entityVariableId('level', 'system.masterdimmer')], '25')
	assert.equal(values[entityVariableId('switch', 'preset.PARTY')], 'on')
	assert.equal(values[entityVariableId('select', 'look.Mode')], 'B')
	assert.equal(values[entityVariableId('sensor', 'system.nowplaying')], 'cue.INTRO')

	applyStates(state, [{ code: 'system.nowplaying', text: '' }], false)
	assert.equal(variableValuesFromState(state).now_playing, 'Stopped')
})

void test('merges partial state updates', () => {
	const state = createInitialState()
	applyStates(state, [{ code: 'system.masterdimmer', level: 0.5, isOn: true }], true)
	applyStates(state, [{ code: 'system.masterdimmer', level: 0.8 }], false)
	assert.equal(state.states.get('system.masterdimmer')?.level, 0.8)
	assert.equal(state.states.get('system.masterdimmer')?.isOn, true)
})

void test('full state replace wipes previous entities', () => {
	const state = createInitialState()
	applyStates(
		state,
		[
			{ code: 'system.masterdimmer', level: 1 },
			{ code: 'system.mute', isOn: true },
		],
		true,
	)
	applyStates(state, [{ code: 'system.mute', isOn: false }], true)
	assert.equal(state.states.size, 1)
	assert.equal(state.states.get('system.mute')?.isOn, false)
	assert.equal(state.states.has('system.masterdimmer'), false)
})

void test('converts percent levels for execute payloads', () => {
	assert.equal(percentToLevel(0), 0)
	assert.equal(percentToLevel(50), 0.5)
	assert.equal(percentToLevel(100), 1)
	assert.equal(formatPercent(0.255), '25.5')
	assert.equal(entityVariableId('level', 'system.masterdimmer'), 'level_system_masterdimmer')
})
