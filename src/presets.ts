import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'
import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import { Colors } from './constants.js'

function buttonStyle(
	text: string,
	bgcolor: number,
	color: number = Colors.White,
): {
	text: string
	size: 'auto'
	color: number
	bgcolor: number
	show_topbar: false
} {
	return {
		text,
		size: 'auto',
		color,
		bgcolor,
		show_topbar: false,
	}
}

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		play_cue: {
			type: 'simple',
			name: 'Play Cue',
			keywords: ['cue', 'play', 'go'],
			style: buttonStyle('Play Cue\nACT1', Colors.Play),
			steps: [
				{
					down: [{ actionId: 'playCue', options: { code: 'ACT1', useLoop: false, loopCount: 1 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'cuePlaying',
					options: { code: 'ACT1' },
					style: { bgcolor: Colors.Playing, color: Colors.White },
				},
			],
		},
		stop_playback: {
			type: 'simple',
			name: 'Stop Playback',
			keywords: ['stop', 'cue'],
			style: buttonStyle('Stop', Colors.Stop),
			steps: [
				{
					down: [{ actionId: 'stopPlayback', options: {} }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'playbackStopped',
					options: {},
					style: { bgcolor: Colors.Stopped, color: Colors.White },
				},
			],
		},
		status: {
			type: 'simple',
			name: 'Playback Status',
			keywords: ['status', 'cue'],
			style: buttonStyle('$(status_text)\n$(playing_cue)', Colors.Status),
			steps: [
				{
					down: [{ actionId: 'requestStatus', options: {} }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'cuePlaying',
					options: { code: '' },
					style: { bgcolor: Colors.Playing, color: Colors.White },
				},
			],
		},
		apply_preset: {
			type: 'simple',
			name: 'Apply Preset',
			keywords: ['preset', 'look', 'scene'],
			style: buttonStyle('Preset\nP1', Colors.Preset),
			steps: [
				{
					down: [{ actionId: 'applyPreset', options: { code: 'P1', useFade: false, fadeMs: 1000 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		start_effect: {
			type: 'simple',
			name: 'Start Effect',
			style: buttonStyle('Effect', Colors.Effect),
			steps: [
				{
					down: [{ actionId: 'startEffect', options: { code: '' } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		clear_effect: {
			type: 'simple',
			name: 'Clear Effect',
			style: buttonStyle('FX Off', Colors.Effect),
			steps: [
				{
					down: [{ actionId: 'clearEffect', options: {} }],
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
					down: [{ actionId: 'setMaster', options: { percent: 0 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'masterAtMost',
					options: { percent: 0 },
					style: { bgcolor: Colors.Master, color: Colors.Black },
				},
			],
		},
		master_25: {
			type: 'simple',
			name: 'Master 25%',
			style: buttonStyle('Master\n25%', Colors.Master),
			steps: [
				{
					down: [{ actionId: 'setMaster', options: { percent: 25 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		master_50: {
			type: 'simple',
			name: 'Master 50%',
			style: buttonStyle('Master\n50%', Colors.Master),
			steps: [
				{
					down: [{ actionId: 'setMaster', options: { percent: 50 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		master_75: {
			type: 'simple',
			name: 'Master 75%',
			style: buttonStyle('Master\n75%', Colors.Master),
			steps: [
				{
					down: [{ actionId: 'setMaster', options: { percent: 75 } }],
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
					down: [{ actionId: 'setMaster', options: { percent: 100 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'masterAtLeast',
					options: { percent: 100 },
					style: { bgcolor: Colors.Playing, color: Colors.White },
				},
			],
		},
		master_encoder: {
			type: 'simple',
			name: 'Master Encoder',
			keywords: ['master', 'encoder', 'rotary'],
			style: buttonStyle('Master\n$(master_percent)%', Colors.Master, Colors.Black),
			options: { stepAutoProgress: false },
			steps: [
				{
					down: [{ actionId: 'requestStatus', options: {} }],
					up: [],
					rotate_left: [{ actionId: 'bumpMaster', options: { deltaPercent: -5 } }],
					rotate_right: [{ actionId: 'bumpMaster', options: { deltaPercent: 5 } }],
				},
			],
			feedbacks: [],
		},
		fade_out: {
			type: 'simple',
			name: 'Fade Master Out',
			style: buttonStyle('Fade Out\n2s', Colors.Stop),
			steps: [
				{
					down: [{ actionId: 'fadeMaster', options: { percent: 0, fadeMs: 2000 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		fade_in: {
			type: 'simple',
			name: 'Fade Master In',
			style: buttonStyle('Fade In\n2s', Colors.Play),
			steps: [
				{
					down: [{ actionId: 'fadeMaster', options: { percent: 100, fadeMs: 2000 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		color_red: {
			type: 'simple',
			name: 'Global Red',
			style: buttonStyle('Red', 0xaa2222),
			steps: [
				{
					down: [{ actionId: 'setGlobalColor', options: { channel: 'red', percent: 100 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		color_green: {
			type: 'simple',
			name: 'Global Green',
			style: buttonStyle('Green', 0x1e8449),
			steps: [
				{
					down: [{ actionId: 'setGlobalColor', options: { channel: 'green', percent: 100 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		color_blue: {
			type: 'simple',
			name: 'Global Blue',
			style: buttonStyle('Blue', 0x1a5276),
			steps: [
				{
					down: [{ actionId: 'setGlobalColor', options: { channel: 'blue', percent: 100 } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		identify_toggle: {
			type: 'simple',
			name: 'Identify Toggle',
			style: buttonStyle('Identify', Colors.Identify),
			steps: [
				{
					down: [{ actionId: 'identify', options: { mode: 'toggle' } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'identifyOn',
					options: {},
					style: { bgcolor: Colors.IdentifyOn, color: Colors.Black },
				},
			],
		},
		identify_on: {
			type: 'simple',
			name: 'Identify On',
			style: buttonStyle('ID On', Colors.Identify),
			steps: [
				{
					down: [{ actionId: 'identify', options: { mode: 'on' } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'identifyOn',
					options: {},
					style: { bgcolor: Colors.IdentifyOn, color: Colors.Black },
				},
			],
		},
		identify_off: {
			type: 'simple',
			name: 'Identify Off',
			style: buttonStyle('ID Off', Colors.Identify),
			steps: [
				{
					down: [{ actionId: 'identify', options: { mode: 'off' } }],
					up: [],
				},
			],
			feedbacks: [],
		},
		request_status: {
			type: 'simple',
			name: 'Request Status',
			style: buttonStyle('Refresh\nStatus', Colors.Status),
			steps: [
				{
					down: [{ actionId: 'requestStatus', options: {} }],
					up: [],
				},
			],
			feedbacks: [],
		},
		ping: {
			type: 'simple',
			name: 'Send Ping',
			style: buttonStyle('Ping', Colors.Custom),
			steps: [
				{
					down: [{ actionId: 'ping', options: {} }],
					up: [],
				},
			],
			feedbacks: [],
		},
		custom_osc: {
			type: 'simple',
			name: 'Custom OSC',
			style: buttonStyle('Custom\nOSC', Colors.Custom),
			steps: [
				{
					down: [
						{
							actionId: 'sendCustom',
							options: {
								path: '/dmxcore/',
								argType: 'none',
								floatValue: 1,
								intValue: 1,
								stringValue: '',
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		},
	}

	const structure: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'playback',
			name: 'Playback',
			description: 'Fire saved cues and show what is running.',
			definitions: [
				{ id: 'go', type: 'simple', name: 'Go / Stop', presets: ['play_cue', 'stop_playback'] },
				{ id: 'status', type: 'simple', name: 'Status', presets: ['status'] },
			],
		},
		{
			id: 'looks',
			name: 'Looks',
			definitions: [
				{ id: 'presets', type: 'simple', name: 'Presets', presets: ['apply_preset'] },
				{ id: 'effects', type: 'simple', name: 'Effects', presets: ['start_effect', 'clear_effect'] },
			],
		},
		{
			id: 'master',
			name: 'Master Dimmer',
			definitions: [
				{
					id: 'levels',
					type: 'simple',
					name: 'Levels',
					presets: ['master_0', 'master_25', 'master_50', 'master_75', 'master_100'],
				},
				{
					id: 'fades',
					type: 'simple',
					name: 'Fades & encoder',
					presets: ['fade_out', 'fade_in', 'master_encoder'],
				},
			],
		},
		{
			id: 'color',
			name: 'Global Color',
			definitions: ['color_red', 'color_green', 'color_blue'],
		},
		{
			id: 'device',
			name: 'Device',
			definitions: [
				{
					id: 'identify',
					type: 'simple',
					name: 'Identify',
					presets: ['identify_toggle', 'identify_on', 'identify_off'],
				},
				{
					id: 'network',
					type: 'simple',
					name: 'Network',
					presets: ['request_status', 'ping', 'custom_osc'],
				},
			],
		},
	]

	self.setPresetDefinitions(structure, presets)
}
