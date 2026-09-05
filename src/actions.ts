import type { CompanionActionDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import {
	FixtureChannels,
	GlobalColorChannels,
	type CustomArgType,
	type FixtureChannel,
	type GlobalColorChannel,
	type IdentifyMode,
} from './constants.js'
import { OscAddress, type OscArg } from './osc.js'
import { assertNever, clamp, nextIdentifyState, percentToLevel } from './util.js'

export type ActionsSchema = {
	playCue: {
		options: {
			code: string
			useLoop: boolean
			loopCount: number
		}
	}
	stopPlayback: { options: Record<string, never> }
	applyPreset: {
		options: {
			code: string
			useFade: boolean
			fadeMs: number
		}
	}
	startEffect: { options: { code: string } }
	clearEffect: { options: Record<string, never> }
	setMaster: { options: { percent: number } }
	fadeMaster: { options: { percent: number; fadeMs: number } }
	bumpMaster: { options: { deltaPercent: number } }
	setZone: { options: { code: string; percent: number } }
	setControl: { options: { code: string; percent: number } }
	setGlobalColor: { options: { channel: GlobalColorChannel; percent: number } }
	setFixtureChannel: { options: { code: string; channel: FixtureChannel; percent: number } }
	setFadeDuration: { options: { fadeMs: number } }
	requestStatus: { options: Record<string, never> }
	identify: { options: { mode: IdentifyMode } }
	ping: { options: Record<string, never> }
	sendCustom: {
		options: {
			path: string
			argType: CustomArgType
			floatValue: number
			intValue: number
			stringValue: string
		}
	}
}

const levelField = {
	id: 'percent' as const,
	type: 'number' as const,
	label: 'Level (%)',
	default: 100,
	min: 0,
	max: 100,
	step: 0.1,
	range: true,
}

function choices<T extends string>(values: readonly T[]): { id: T; label: string }[] {
	return values.map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }))
}

export function UpdateActions(self: ModuleInstance): void {
	const actions: CompanionActionDefinitions<ActionsSchema> = {
		playCue: {
			name: 'Play Cue',
			description: 'Play a cue by its Code / Short Name. Codes are case-sensitive.',
			options: [
				{
					id: 'code',
					type: 'textinput',
					label: 'Cue code',
					default: 'ACT1',
					useVariables: true,
				},
				{
					id: 'useLoop',
					type: 'checkbox',
					label: 'Override loop count',
					default: false,
					disableAutoExpression: true,
				},
				{
					id: 'loopCount',
					type: 'number',
					label: 'Loop count',
					default: 1,
					min: 0,
					max: 9999,
					tooltip: '0 loops forever on many DMX Core setups. Omit the override to use the cue default.',
					isVisibleExpression: '$(options:useLoop) === true',
				},
			],
			callback: async (event) => {
				const code = String(event.options.code ?? '').trim()
				if (!code) {
					self.log('warn', 'Play Cue ignored: cue code is empty')
					return
				}

				const args: OscArg[] = []
				if (event.options.useLoop) {
					args.push({ type: 'i', value: Math.trunc(event.options.loopCount) })
				}

				self.sendCommand(OscAddress.cue(code), args, {
					playingCue: code,
					statusText: `Playing '${code}'`,
				})
			},
		},
		stopPlayback: {
			name: 'Stop Playback',
			options: [],
			callback: async () => {
				self.sendCommand(OscAddress.stop, [], {
					playingCue: '',
					statusText: 'Stopped',
				})
			},
		},
		applyPreset: {
			name: 'Apply Preset',
			description: 'Fade to a preset by its code. Omit fade time to use the device default.',
			options: [
				{
					id: 'code',
					type: 'textinput',
					label: 'Preset code',
					default: 'P1',
					useVariables: true,
				},
				{
					id: 'useFade',
					type: 'checkbox',
					label: 'Override fade time',
					default: false,
					disableAutoExpression: true,
				},
				{
					id: 'fadeMs',
					type: 'number',
					label: 'Fade time (ms)',
					default: 1000,
					min: 0,
					max: 600000,
					isVisibleExpression: '$(options:useFade) === true',
				},
			],
			callback: async (event) => {
				const code = String(event.options.code ?? '').trim()
				if (!code) {
					self.log('warn', 'Apply Preset ignored: preset code is empty')
					return
				}

				const args: OscArg[] = []
				if (event.options.useFade) {
					args.push({ type: 'i', value: Math.trunc(event.options.fadeMs) })
				}

				self.sendCommand(OscAddress.preset(code), args)
			},
		},
		startEffect: {
			name: 'Start Effect',
			options: [
				{
					id: 'code',
					type: 'textinput',
					label: 'Effect code',
					default: '',
					useVariables: true,
				},
			],
			callback: async (event) => {
				const code = String(event.options.code ?? '').trim()
				if (!code) {
					self.log('warn', 'Start Effect ignored: effect code is empty')
					return
				}
				self.sendCommand(OscAddress.effect(code), [{ type: 'i', value: 1 }])
			},
		},
		clearEffect: {
			name: 'Clear Global Effect',
			options: [],
			callback: async () => {
				self.sendCommand(OscAddress.effectNone)
			},
		},
		setMaster: {
			name: 'Set Master Dimmer',
			options: [levelField],
			callback: async (event) => {
				const level = percentToLevel(event.options.percent)
				self.sendCommand(OscAddress.master, [{ type: 'f', value: level }], { master: level })
			},
		},
		fadeMaster: {
			name: 'Fade Master Dimmer',
			options: [
				levelField,
				{
					id: 'fadeMs',
					type: 'number',
					label: 'Fade time (ms)',
					default: 2000,
					min: 0,
					max: 600000,
				},
			],
			callback: async (event) => {
				const level = percentToLevel(event.options.percent)
				self.sendCommand(
					OscAddress.masterFadeTo,
					[
						{ type: 'f', value: level },
						{ type: 'i', value: Math.trunc(event.options.fadeMs) },
					],
					{ master: level },
				)
			},
		},
		bumpMaster: {
			name: 'Bump Master Dimmer',
			description: 'Add or subtract a percentage from the current master. Useful on rotary encoders.',
			options: [
				{
					id: 'deltaPercent',
					type: 'number',
					label: 'Change (%)',
					default: 5,
					min: -100,
					max: 100,
					step: 0.1,
				},
			],
			callback: async (event) => {
				const current = self.state.master ?? 1
				const level = clamp(current + percentToLevel(event.options.deltaPercent), 0, 1)
				self.sendCommand(OscAddress.master, [{ type: 'f', value: level }], { master: level })
			},
		},
		setZone: {
			name: 'Set Zone Intensity',
			options: [
				{
					id: 'code',
					type: 'textinput',
					label: 'Zone code',
					default: 'Z1',
					useVariables: true,
				},
				levelField,
			],
			callback: async (event) => {
				const code = String(event.options.code ?? '').trim()
				if (!code) {
					self.log('warn', 'Set Zone ignored: zone code is empty')
					return
				}
				self.sendCommand(OscAddress.zone(code), [{ type: 'f', value: percentToLevel(event.options.percent) }])
			},
		},
		setControl: {
			name: 'Set Control Value',
			description: 'Set a Level-kind Control Value by code (external DSP level).',
			options: [
				{
					id: 'code',
					type: 'textinput',
					label: 'Control Value code',
					default: '',
					useVariables: true,
				},
				levelField,
			],
			callback: async (event) => {
				const code = String(event.options.code ?? '').trim()
				if (!code) {
					self.log('warn', 'Set Control Value ignored: code is empty')
					return
				}
				const level = percentToLevel(event.options.percent)
				self.sendCommand(OscAddress.control(code), [{ type: 'f', value: level }], {
					controlValues: { ...self.state.controlValues, [code.toLowerCase()]: level },
				})
			},
		},
		setGlobalColor: {
			name: 'Set Global Fixture Color',
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					default: 'red',
					choices: choices(GlobalColorChannels),
				},
				levelField,
			],
			callback: async (event) => {
				const channel = event.options.channel
				const level = percentToLevel(event.options.percent)
				const patch =
					channel === 'red'
						? { fixtureRed: level }
						: channel === 'green'
							? { fixtureGreen: level }
							: { fixtureBlue: level }
				self.sendCommand(OscAddress.globalColor(channel), [{ type: 'f', value: level }], patch)
			},
		},
		setFixtureChannel: {
			name: 'Set Fixture Channel',
			options: [
				{
					id: 'code',
					type: 'textinput',
					label: 'Fixture code',
					default: '',
					useVariables: true,
				},
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					default: 'dimmer',
					choices: choices(FixtureChannels),
				},
				levelField,
			],
			callback: async (event) => {
				const code = String(event.options.code ?? '').trim()
				if (!code) {
					self.log('warn', 'Set Fixture Channel ignored: fixture code is empty')
					return
				}
				self.sendCommand(OscAddress.fixture(code, event.options.channel), [
					{ type: 'f', value: percentToLevel(event.options.percent) },
				])
			},
		},
		setFadeDuration: {
			name: 'Set Default Fade Duration',
			options: [
				{
					id: 'fadeMs',
					type: 'number',
					label: 'Fade time (ms)',
					default: 1000,
					min: 0,
					max: 600000,
				},
			],
			callback: async (event) => {
				self.sendCommand(OscAddress.fadeDuration, [{ type: 'i', value: Math.trunc(event.options.fadeMs) }])
			},
		},
		requestStatus: {
			name: 'Request Status Feedback',
			description: 'Ask DMX Core to re-send the full OSC status set.',
			options: [],
			callback: async () => {
				self.sendCommand(OscAddress.status)
			},
		},
		identify: {
			name: 'Identify Blink',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'State',
					default: 'toggle',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (event) => {
				const on = nextIdentifyState(event.options.mode, self.state.identify)
				self.sendCommand(OscAddress.blink, [{ type: 'i', value: on ? 1 : 0 }], { identify: on })
			},
		},
		ping: {
			name: 'Send /ping',
			description: 'Keep-alive that registers Companion for OSC feedback without changing playback.',
			options: [],
			callback: async () => {
				self.sendCommand(OscAddress.ping)
			},
		},
		sendCustom: {
			name: 'Send Custom OSC',
			description: 'Send any OSC address. Use this for input triggers you defined in the DMX Core Web UI.',
			options: [
				{
					id: 'path',
					type: 'textinput',
					label: 'OSC address',
					default: '/dmxcore/',
					useVariables: true,
				},
				{
					id: 'argType',
					type: 'dropdown',
					label: 'Argument',
					default: 'none',
					disableAutoExpression: true,
					choices: [
						{ id: 'none', label: 'None' },
						{ id: 'float', label: 'Float (0–1 levels, etc.)' },
						{ id: 'integer', label: 'Integer' },
						{ id: 'string', label: 'String' },
					],
				},
				{
					id: 'floatValue',
					type: 'number',
					label: 'Float value',
					default: 1,
					min: -100000,
					max: 100000,
					step: 0.001,
					isVisibleExpression: '$(options:argType) === "float"',
				},
				{
					id: 'intValue',
					type: 'number',
					label: 'Integer value',
					default: 1,
					min: -1000000,
					max: 1000000,
					isVisibleExpression: '$(options:argType) === "integer"',
				},
				{
					id: 'stringValue',
					type: 'textinput',
					label: 'String value',
					default: '',
					useVariables: true,
					isVisibleExpression: '$(options:argType) === "string"',
				},
			],
			callback: async (event) => {
				const path = String(event.options.path ?? '').trim()
				if (!path.startsWith('/')) {
					self.log('warn', `Custom OSC ignored: address must start with / (${path})`)
					return
				}

				const argType = event.options.argType
				const args: OscArg[] = []
				switch (argType) {
					case 'none':
						break
					case 'float':
						args.push({ type: 'f', value: event.options.floatValue })
						break
					case 'integer':
						args.push({ type: 'i', value: Math.trunc(event.options.intValue) })
						break
					case 'string':
						args.push({ type: 's', value: String(event.options.stringValue ?? '') })
						break
					default:
						assertNever(argType)
				}

				self.sendCommand(path, args)
			},
		},
	}

	self.setActionDefinitions(actions)
}
