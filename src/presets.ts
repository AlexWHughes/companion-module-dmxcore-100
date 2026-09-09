import type { CompanionPresetDefinitions, CompanionPresetSection, CompanionTextSize } from '@companion-module/base'
import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import { Colors, SYSTEM_MASTER, SYSTEM_STOP } from './constants.js'
import type { IntegrationEntity } from './entities.js'
import { entitiesOfKind } from './entities.js'

/** Fixed size so labels stay readable without auto upsizing that mid-word wraps. */
const PRESET_TEXT_SIZE: CompanionTextSize = '14'

function buttonStyle(
	text: string,
	bgcolor: number,
	color: number = Colors.White,
): {
	text: string
	size: CompanionTextSize
	color: number
	bgcolor: number
	show_topbar: false
} {
	return {
		text,
		size: PRESET_TEXT_SIZE,
		color,
		bgcolor,
		show_topbar: false,
	}
}

function shortLabel(entity: IntegrationEntity, max = 22): string {
	const name = entity.name.trim() || entity.code
	if (name.length <= max) return name
	return `${name.slice(0, max - 1)}…`
}

function presetId(prefix: string, code: string): string {
	const safe = code
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
	return `${prefix}_${safe || 'entity'}`
}

function varRef(label: string, name: string): string {
	return `$(${label}:${name})`
}

export function UpdatePresets(self: ModuleInstance): void {
	const label = self.label || 'dmxcore'
	const entities = [...self.state.entities.values()]
	const scenes = entitiesOfKind(entities, 'scene')
	const switches = entitiesOfKind(entities, 'switch')
	const buttons = entitiesOfKind(entities, 'button')
	const levels = entitiesOfKind(entities, 'level')

	const stopCode = self.state.entities.has(SYSTEM_STOP) ? SYSTEM_STOP : 'system.stop'
	const masterCode = self.state.entities.has(SYSTEM_MASTER) ? SYSTEM_MASTER : 'system.masterdimmer'

	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		now_playing: {
			type: 'simple',
			name: 'Now Playing',
			keywords: ['status', 'sensor', 'now playing', 'stopped'],
			style: buttonStyle(varRef(label, 'now_playing'), Colors.Stopped),
			steps: [
				{
					down: [{ actionId: 'refreshCatalog', options: {} }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'nowPlaying',
					options: {},
					style: { bgcolor: Colors.Playing, color: Colors.White },
				},
			],
		},
		stop_button: {
			type: 'simple',
			name: 'Stop',
			keywords: ['stop', 'button'],
			style: buttonStyle('Stop', Colors.Stop),
			steps: [
				{
					down: [{ actionId: 'activateButton', options: { code: stopCode } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		master_0: {
			type: 'simple',
			name: 'Master 0%',
			style: buttonStyle('Master\n0%', Colors.MasterOff),
			steps: [
				{
					down: [{ actionId: 'setLevel', options: { code: masterCode, percent: 0 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'levelAtMost',
					options: { code: masterCode, percent: 0 },
					style: { bgcolor: Colors.Master, color: Colors.Black },
				},
			],
		},
		master_50: {
			type: 'simple',
			name: 'Master 50%',
			style: buttonStyle('Master\n50%', Colors.Master),
			steps: [
				{
					down: [{ actionId: 'setLevel', options: { code: masterCode, percent: 50 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		master_100: {
			type: 'simple',
			name: 'Master 100%',
			style: buttonStyle('Master\n100%', Colors.Master),
			steps: [
				{
					down: [{ actionId: 'setLevel', options: { code: masterCode, percent: 100 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'levelAtLeast',
					options: { code: masterCode, percent: 100 },
					style: { bgcolor: Colors.Playing, color: Colors.White },
				},
			],
		},
		master_encoder: {
			type: 'simple',
			name: 'Master Encoder',
			keywords: ['master', 'encoder', 'rotary'],
			style: buttonStyle(`Master\n${varRef(label, 'master_percent')}%`, Colors.Master, Colors.Black),
			options: { stepAutoProgress: false },
			steps: [
				{
					down: [{ actionId: 'refreshCatalog', options: {} }],
					up: [],
					rotate_left: [{ actionId: 'bumpLevel', options: { code: masterCode, deltaPercent: -5 } }],
					rotate_right: [{ actionId: 'bumpLevel', options: { code: masterCode, deltaPercent: 5 } }],
				},
			],
			feedbacks: [],
		},
		refresh: {
			type: 'simple',
			name: 'Refresh Catalog',
			style: buttonStyle('Refresh', Colors.Device),
			steps: [
				{
					down: [{ actionId: 'refreshCatalog', options: {} }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'connectionOk',
					options: {},
					style: { bgcolor: Colors.Playing, color: Colors.White },
				},
			],
		},
	}

	const scenePresetIds: string[] = []
	for (const scene of scenes) {
		const id = presetId('scene', scene.code)
		scenePresetIds.push(id)
		presets[id] = {
			type: 'simple',
			name: `Play ${scene.name}`,
			keywords: ['scene', 'cue', 'play', scene.code],
			style: buttonStyle(shortLabel(scene), Colors.Play),
			steps: [
				{
					down: [
						{
							actionId: 'activateScene',
							options: { code: scene.code, overrideLoop: true, loopCount: 0 },
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'sensorContains',
					options: { code: 'system.nowplaying', text: scene.code.replace(/^(cue|timeline|sound)\./i, '') },
					style: { bgcolor: Colors.Playing, color: Colors.White },
				},
			],
		}
	}

	if (scenePresetIds.length === 0) {
		presets.activate_scene = {
			type: 'simple',
			name: 'Activate Scene',
			keywords: ['scene', 'cue', 'play'],
			style: buttonStyle('Scene', Colors.Play),
			steps: [
				{
					down: [
						{
							actionId: 'activateScene',
							options: { code: 'cue.INTRO', overrideLoop: true, loopCount: 0 },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		scenePresetIds.push('activate_scene')
	}

	const switchPresetIds: string[] = []
	for (const sw of switches) {
		const id = presetId('switch', sw.code)
		switchPresetIds.push(id)
		presets[id] = {
			type: 'simple',
			name: `Toggle ${sw.name}`,
			keywords: ['switch', 'toggle', sw.code],
			style: buttonStyle(shortLabel(sw), Colors.Preset),
			steps: [
				{
					down: [{ actionId: 'switchEntity', options: { code: sw.code, command: 'toggle' } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'switchOn',
					options: { code: sw.code },
					style: { bgcolor: Colors.SwitchOn, color: Colors.Black },
				},
			],
		}
	}

	const buttonPresetIds: string[] = []
	for (const button of buttons) {
		if (button.code === stopCode) continue
		const id = presetId('button', button.code)
		buttonPresetIds.push(id)
		presets[id] = {
			type: 'simple',
			name: button.name,
			keywords: ['button', button.code],
			style: buttonStyle(shortLabel(button), Colors.Device),
			steps: [
				{
					down: [{ actionId: 'activateButton', options: { code: button.code } }],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	const levelPresetIds: string[] = []
	for (const level of levels) {
		if (level.code === masterCode) continue
		const id = presetId('level', level.code)
		levelPresetIds.push(id)
		presets[id] = {
			type: 'simple',
			name: `${level.name} 100%`,
			keywords: ['level', level.code],
			style: buttonStyle(`${shortLabel(level)}\n100%`, Colors.Master),
			steps: [
				{
					down: [{ actionId: 'setLevel', options: { code: level.code, percent: 100 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'levelAtLeast',
					options: { code: level.code, percent: 100 },
					style: { bgcolor: Colors.Playing, color: Colors.White },
				},
			],
		}
	}

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'playback',
			name: 'Playback',
			description: 'Scenes from the live catalog (loop forever by default).',
			definitions: [{ id: 'scenes', type: 'simple', name: 'Scenes', presets: scenePresetIds }],
		},
	]

	if (switchPresetIds.length > 0 || buttonPresetIds.length > 0) {
		structure.push({
			id: 'looks',
			name: 'Looks & buttons',
			definitions: [
				...(switchPresetIds.length
					? [{ id: 'switches', type: 'simple' as const, name: 'Switches', presets: switchPresetIds }]
					: []),
				...(buttonPresetIds.length
					? [{ id: 'buttons', type: 'simple' as const, name: 'Buttons', presets: buttonPresetIds }]
					: []),
			],
		})
	}

	structure.push({
		id: 'master',
		name: 'Levels',
		definitions: [
			{
				id: 'master',
				type: 'simple',
				name: 'Master dimmer',
				presets: ['master_0', 'master_50', 'master_100', 'master_encoder'],
			},
			...(levelPresetIds.length
				? [{ id: 'other_levels', type: 'simple' as const, name: 'Other levels', presets: levelPresetIds }]
				: []),
		],
	})

	structure.push({
		id: 'device',
		name: 'Device',
		definitions: [
			{
				id: 'status',
				type: 'simple',
				name: 'Status',
				presets: ['now_playing', 'stop_button', 'refresh'],
			},
		],
	})

	self.setPresetDefinitions(structure, presets)
}
