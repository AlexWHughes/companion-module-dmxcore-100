import type { CompanionActionDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { SwitchCommands, type SwitchCommand } from './constants.js'
import { choiceDropdown, entityChoices } from './entities.js'
import { assertNever, clamp, percentToLevel } from './util.js'
import { getLevel } from './state.js'

export type ActionsSchema = {
	activateScene: { options: { code: string } }
	activateButton: { options: { code: string } }
	switchEntity: { options: { code: string; command: SwitchCommand } }
	setLevel: { options: { code: string; percent: number } }
	bumpLevel: { options: { code: string; deltaPercent: number } }
	setChoice: { options: { code: string; choice: string } }
	refreshCatalog: { options: Record<string, never> }
}

const levelField = {
	id: 'percent' as const,
	type: 'number' as const,
	label: 'Level (%)',
	default: 100,
	min: 0,
	max: 100,
	step: 0.1,
}

function switchCommandChoices(): { id: SwitchCommand; label: string }[] {
	return SwitchCommands.map((command) => ({ id: command, label: command }))
}

export function UpdateActions(self: ModuleInstance): void {
	const scenes = entityChoices(self.state.entities.values(), 'scene')
	const buttons = entityChoices(self.state.entities.values(), 'button', 'No system actions yet — refresh catalog', {
		includeCode: false,
	})
	const switches = entityChoices(self.state.entities.values(), 'switch')
	const levels = entityChoices(self.state.entities.values(), 'level')
	const selects = entityChoices(self.state.entities.values(), 'select')

	const defaultScene = scenes[0]?.id ?? ''
	const defaultButton = buttons[0]?.id ?? ''
	const defaultSwitch = switches[0]?.id ?? ''
	const defaultLevel = levels[0]?.id ?? ''
	const defaultSelect = selects[0]?.id ?? ''
	const selectEntity = self.state.entities.get(defaultSelect)
	const choiceOptions = choiceDropdown(selectEntity?.choices)

	const actions: CompanionActionDefinitions<ActionsSchema> = {
		activateScene: {
			name: 'Activate scene',
			description:
				'Activate a scene entity (cue, timeline, sound, …). Looping uses the cue/sound’s saved Loop setting in the DMX Core Web UI (0 = forever).',
			options: [
				{
					id: 'code',
					type: 'dropdown',
					label: 'Scene',
					default: defaultScene,
					choices: scenes,
					allowCustom: true,
				},
			],
			callback: async (action) => {
				const code = String(action.options.code ?? '').trim()
				if (!code) return
				await self.execute({ code, command: 'activate' })
			},
		},
		activateButton: {
			name: 'System actions',
			description: 'Fire a system action such as Stop, Blackout, or Clear Ambient.',
			options: [
				{
					id: 'code',
					type: 'dropdown',
					label: 'Action',
					default: defaultButton,
					choices: buttons,
					allowCustom: true,
				},
			],
			callback: async (action) => {
				const code = String(action.options.code ?? '').trim()
				if (!code) return
				await self.execute({ code, command: 'activate' })
			},
		},
		switchEntity: {
			name: 'Switch entity',
			description: 'Turn on, turn off, or toggle a switch entity (preset, ambient, mute, …).',
			options: [
				{
					id: 'code',
					type: 'dropdown',
					label: 'Switch',
					default: defaultSwitch,
					choices: switches,
					allowCustom: true,
				},
				{
					id: 'command',
					type: 'dropdown',
					label: 'Command',
					default: 'toggle',
					choices: switchCommandChoices(),
				},
			],
			callback: async (action) => {
				const code = String(action.options.code ?? '').trim()
				const command = action.options.command
				if (!code) return
				if (command !== 'turnOn' && command !== 'turnOff' && command !== 'toggle') {
					assertNever(command)
				}
				await self.execute({ code, command })
			},
		},
		setLevel: {
			name: 'Set level',
			description: 'Set a level entity (0–100%). Sent as 0–1 to the device.',
			options: [
				{
					id: 'code',
					type: 'dropdown',
					label: 'Level',
					default: defaultLevel,
					choices: levels,
					allowCustom: true,
				},
				levelField,
			],
			callback: async (action) => {
				const code = String(action.options.code ?? '').trim()
				if (!code) return
				const percent = Number(action.options.percent)
				const level = percentToLevel(percent)
				const accepted = await self.execute({ code, command: 'setLevel', level }, { preferWs: true })
				if (accepted) self.applyLocalLevel(code, level)
			},
		},
		bumpLevel: {
			name: 'Bump level',
			description: 'Adjust a level entity by a percentage delta from its current state.',
			options: [
				{
					id: 'code',
					type: 'dropdown',
					label: 'Level',
					default: defaultLevel,
					choices: levels,
					allowCustom: true,
				},
				{
					id: 'deltaPercent',
					type: 'number',
					label: 'Delta (%)',
					default: 5,
					min: -100,
					max: 100,
					step: 0.1,
				},
			],
			callback: async (action) => {
				const code = String(action.options.code ?? '').trim()
				if (!code) return
				const current = getLevel(self.state, code) ?? 0
				const nextPercent = clamp(current * 100 + Number(action.options.deltaPercent), 0, 100)
				const level = percentToLevel(nextPercent)
				const accepted = await self.execute({ code, command: 'setLevel', level }, { preferWs: true })
				if (accepted) self.applyLocalLevel(code, level)
			},
		},
		setChoice: {
			name: 'Set choice',
			description: 'Set a select entity to one of its catalog choices.',
			options: [
				{
					id: 'code',
					type: 'dropdown',
					label: 'Select',
					default: defaultSelect,
					choices: selects,
					allowCustom: true,
				},
				{
					id: 'choice',
					type: 'dropdown',
					label: 'Choice',
					default: choiceOptions[0]?.id ?? '',
					choices: choiceOptions,
					allowCustom: true,
					tooltip: 'Choices come from the selected entity in the catalog. Use custom text if needed.',
				},
			],
			callback: async (action) => {
				const code = String(action.options.code ?? '').trim()
				const choice = String(action.options.choice ?? '').trim()
				if (!code || !choice) return
				await self.execute({ code, command: 'setChoice', choice })
			},
		},
		refreshCatalog: {
			name: 'Refresh catalog',
			description: 'Re-fetch catalog and state over HTTP.',
			options: [],
			callback: async () => {
				await self.refreshCatalog()
			},
		},
	}

	self.setActionDefinitions(actions)
}
