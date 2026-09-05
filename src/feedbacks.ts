import type { CompanionFeedbackDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { Colors } from './constants.js'
import { isCuePlaying } from './state.js'
import { parseCodeList, percentToLevel } from './util.js'

export type FeedbacksSchema = {
	cuePlaying: {
		type: 'boolean'
		options: { code: string }
	}
	playbackStopped: {
		type: 'boolean'
		options: Record<string, never>
	}
	identifyOn: {
		type: 'boolean'
		options: Record<string, never>
	}
	masterAtLeast: {
		type: 'boolean'
		options: { percent: number }
	}
	masterAtMost: {
		type: 'boolean'
		options: { percent: number }
	}
	controlAtLeast: {
		type: 'boolean'
		options: { code: string; percent: number }
	}
	statusContains: {
		type: 'boolean'
		options: { text: string }
	}
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	const feedbacks: CompanionFeedbackDefinitions<FeedbacksSchema> = {
		cuePlaying: {
			name: 'Cue is playing',
			description: 'True when the given cue code is playing. Leave the code empty to match any cue.',
			type: 'boolean',
			defaultStyle: {
				bgcolor: Colors.Playing,
				color: Colors.White,
			},
			options: [
				{
					id: 'code',
					type: 'textinput',
					label: 'Cue code (blank = any)',
					default: '',
					useVariables: true,
				},
			],
			callback: (feedback) => isCuePlaying(self.state, String(feedback.options.code ?? '').trim()),
		},
		playbackStopped: {
			name: 'Playback is stopped',
			type: 'boolean',
			defaultStyle: {
				bgcolor: Colors.Stopped,
				color: Colors.White,
			},
			options: [],
			callback: () => !self.state.playingCue,
		},
		identifyOn: {
			name: 'Identify blink is on',
			type: 'boolean',
			defaultStyle: {
				bgcolor: Colors.IdentifyOn,
				color: Colors.Black,
			},
			options: [],
			callback: () => self.state.identify,
		},
		masterAtLeast: {
			name: 'Master dimmer at least',
			type: 'boolean',
			defaultStyle: {
				bgcolor: Colors.Master,
				color: Colors.Black,
			},
			options: [
				{
					id: 'percent',
					type: 'number',
					label: 'Level (%)',
					default: 50,
					min: 0,
					max: 100,
					step: 0.1,
					range: true,
				},
			],
			callback: (feedback) => {
				if (self.state.master === null) return false
				return self.state.master + 0.0005 >= percentToLevel(feedback.options.percent)
			},
		},
		masterAtMost: {
			name: 'Master dimmer at most',
			type: 'boolean',
			defaultStyle: {
				bgcolor: Colors.MasterOff,
				color: Colors.White,
			},
			options: [
				{
					id: 'percent',
					type: 'number',
					label: 'Level (%)',
					default: 0,
					min: 0,
					max: 100,
					step: 0.1,
					range: true,
				},
			],
			callback: (feedback) => {
				if (self.state.master === null) return false
				return self.state.master - 0.0005 <= percentToLevel(feedback.options.percent)
			},
		},
		controlAtLeast: {
			name: 'Control Value at least',
			type: 'boolean',
			defaultStyle: {
				bgcolor: Colors.Preset,
				color: Colors.White,
			},
			options: [
				{
					id: 'code',
					type: 'textinput',
					label: 'Control Value code',
					default: parseCodeList(self.config.controlCodes)[0] ?? '',
					useVariables: true,
				},
				{
					id: 'percent',
					type: 'number',
					label: 'Level (%)',
					default: 50,
					min: 0,
					max: 100,
					step: 0.1,
					range: true,
				},
			],
			callback: (feedback) => {
				const code = String(feedback.options.code ?? '')
					.trim()
					.toLowerCase()
				if (!code) return false
				const level = self.state.controlValues[code]
				if (level === undefined) return false
				return level + 0.0005 >= percentToLevel(feedback.options.percent)
			},
		},
		statusContains: {
			name: 'Status text contains',
			type: 'boolean',
			defaultStyle: {
				bgcolor: Colors.Play,
				color: Colors.White,
			},
			options: [
				{
					id: 'text',
					type: 'textinput',
					label: 'Text',
					default: 'Playing',
					useVariables: true,
				},
			],
			callback: (feedback) => {
				const needle = String(feedback.options.text ?? '')
					.trim()
					.toLowerCase()
				if (!needle) return false
				return self.state.statusText.toLowerCase().includes(needle)
			},
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
