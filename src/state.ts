import type { CompanionVariableDefinition } from '@companion-module/base'
import { SYSTEM_MASTER, SYSTEM_NOW_PLAYING, type EntityKind } from './constants.js'
import {
	entityVariableId,
	entityVariableName,
	type DeviceInfo,
	type DeviceStatus,
	type EntityState,
	type IntegrationEntity,
} from './entities.js'
import { formatPercent } from './util.js'

export interface DmxCoreState {
	connected: boolean
	info: DeviceInfo | null
	status: DeviceStatus | null
	entities: Map<string, IntegrationEntity>
	states: Map<string, EntityState>
}

export function createInitialState(): DmxCoreState {
	return {
		connected: false,
		info: null,
		status: null,
		entities: new Map(),
		states: new Map(),
	}
}

export function replaceCatalog(state: DmxCoreState, entities: IntegrationEntity[]): void {
	state.entities = new Map(entities.map((entity) => [entity.code, entity]))
}

export function applyStates(state: DmxCoreState, states: EntityState[], full: boolean): void {
	if (full) {
		state.states = new Map(states.map((entry) => [entry.code, entry]))
		return
	}

	for (const entry of states) {
		const previous = state.states.get(entry.code) ?? { code: entry.code }
		state.states.set(entry.code, {
			code: entry.code,
			isOn: entry.isOn ?? previous.isOn,
			level: entry.level ?? previous.level,
			choice: entry.choice ?? previous.choice,
			text: entry.text ?? previous.text,
		})
	}
}

export function getEntity(state: DmxCoreState, code: string): IntegrationEntity | undefined {
	return state.entities.get(code)
}

export function getEntityState(state: DmxCoreState, code: string): EntityState | undefined {
	return state.states.get(code)
}

export function getLevel(state: DmxCoreState, code: string): number | null {
	const level = state.states.get(code)?.level
	return typeof level === 'number' ? level : null
}

export function isSwitchOn(state: DmxCoreState, code: string): boolean {
	return state.states.get(code)?.isOn === true
}

export function sensorText(state: DmxCoreState, code: string): string {
	return state.states.get(code)?.text ?? ''
}

/** Human-readable playback label for buttons; empty sensor → Stopped. */
export function nowPlayingLabel(state: DmxCoreState): string {
	const text = sensorText(state, SYSTEM_NOW_PLAYING).trim()
	return text || 'Stopped'
}

export function isNowPlaying(state: DmxCoreState): boolean {
	return sensorText(state, SYSTEM_NOW_PLAYING).trim().length > 0
}

export function selectChoice(state: DmxCoreState, code: string): string {
	return state.states.get(code)?.choice ?? ''
}

/** Prefer device nickname from `/api/status`, then Integration `/info` name. */
export function displayDeviceName(state: DmxCoreState): string {
	return state.status?.deviceNickname || state.info?.deviceName || ''
}

function formatOptionalNumber(value: number | null | undefined, digits = 1): string {
	if (value === null || value === undefined) return ''
	return Number.isInteger(value) ? String(value) : value.toFixed(digits)
}

export function variableDefinitionsFromState(state: DmxCoreState): Record<string, CompanionVariableDefinition> {
	const definitions: Record<string, CompanionVariableDefinition> = {
		product: { name: 'Product' },
		device_name: { name: 'Device name' },
		serial: { name: 'Serial' },
		software_version: { name: 'Software version' },
		protocol_version: { name: 'Integration protocol version' },
		connected: { name: 'Connected' },
		now_playing: { name: 'Now playing' },
		master_percent: { name: 'Master dimmer (%)' },
		master_level: { name: 'Master dimmer (0–1)' },
		entity_count: { name: 'Catalog entity count' },
		show_name: { name: 'Show name' },
		hostname: { name: 'Hostname' },
		app_version: { name: 'App version' },
		cpu_temp_c: { name: 'CPU temperature (°C)' },
		board_temp_c: { name: 'Board temperature (°C)' },
		sys_cpu_percent: { name: 'System CPU (%)' },
		app_cpu_percent: { name: 'App CPU (%)' },
		sys_memory_mb: { name: 'System memory used (MB)' },
		sys_memory_total_mb: { name: 'System memory total (MB)' },
		app_memory_mb: { name: 'App memory used (MB)' },
		storage_mb: { name: 'Storage used (MB)' },
		storage_total_mb: { name: 'Storage total (MB)' },
		network_speed_mbit: { name: 'Network speed (Mbit)' },
		audio_available: { name: 'Audio available' },
		app_uptime_h: { name: 'App uptime (hours)' },
		sys_uptime_h: { name: 'System uptime (hours)' },
		recorder: { name: 'Recorder state' },
		player_name: { name: 'Player name' },
		player_code: { name: 'Player code' },
	}

	for (const entity of state.entities.values()) {
		if (entity.kind === 'button' || entity.kind === 'scene') continue
		definitions[entityVariableId(entity.kind, entity.code)] = { name: entityVariableName(entity) }
	}

	return definitions
}

export function variableValuesFromState(state: DmxCoreState): Record<string, string | number | undefined> {
	const master = getLevel(state, SYSTEM_MASTER)
	const status = state.status
	const values: Record<string, string | number | undefined> = {
		product: state.info?.product ?? '',
		device_name: displayDeviceName(state),
		serial: state.info?.serial ?? '',
		software_version: state.info?.softwareVersion || status?.appVersion || '',
		protocol_version: state.info ? String(state.info.protocolVersion) : '',
		connected: state.connected ? 'true' : 'false',
		now_playing: nowPlayingLabel(state),
		master_percent: formatPercent(master),
		master_level: master === null ? '' : String(master),
		entity_count: String(state.entities.size),
		show_name: status?.showName ?? '',
		hostname: status?.hostName ?? '',
		app_version: status?.appVersion || state.info?.softwareVersion || '',
		cpu_temp_c: formatOptionalNumber(status?.cpuTemperatureC),
		board_temp_c: formatOptionalNumber(status?.boardTemperatureC),
		sys_cpu_percent: formatOptionalNumber(status?.sysCpuUsage),
		app_cpu_percent: formatOptionalNumber(status?.appCpuUsage),
		sys_memory_mb: formatOptionalNumber(status?.sysMemoryUsageMB, 0),
		sys_memory_total_mb: formatOptionalNumber(status?.sysMemoryTotalMB, 0),
		app_memory_mb: formatOptionalNumber(status?.appMemoryUsageMB, 0),
		storage_mb: formatOptionalNumber(status?.storageUsageMB, 0),
		storage_total_mb: formatOptionalNumber(status?.storageTotalMB, 0),
		network_speed_mbit: formatOptionalNumber(status?.networkSpeedMbit, 0),
		audio_available:
			status?.audioAvailable === null || status?.audioAvailable === undefined ? '' : String(status.audioAvailable),
		app_uptime_h: formatOptionalNumber(status?.appUpTimeH),
		sys_uptime_h: formatOptionalNumber(status?.sysUpTimeH),
		recorder: status?.recorder ?? '',
		player_name: status?.playerName ?? '',
		player_code: status?.playerCode ?? '',
	}

	for (const entity of state.entities.values()) {
		const id = entityVariableId(entity.kind, entity.code)
		const entityState = state.states.get(entity.code)
		values[id] = formatEntityVariable(entity.kind, entityState)
	}

	return values
}

function formatEntityVariable(kind: EntityKind, entityState: EntityState | undefined): string {
	switch (kind) {
		case 'switch':
			return entityState?.isOn ? 'on' : 'off'
		case 'level':
			return formatPercent(typeof entityState?.level === 'number' ? entityState.level : null)
		case 'select':
			return entityState?.choice ?? ''
		case 'sensor':
			return entityState?.text ?? ''
		case 'scene':
		case 'button':
			return ''
		default: {
			const _exhaustive: never = kind
			return _exhaustive
		}
	}
}
