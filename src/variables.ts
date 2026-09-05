import type { CompanionVariableDefinition, CompanionVariableDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { controlVariableId, parseCodeList } from './util.js'
import { variableValuesFromState } from './state.js'

export type VariablesSchema = {
	status_text: string
	playing_cue: string
	playback_state: string
	master_level: string
	master_percent: string
	fixture_red: string
	fixture_green: string
	fixture_blue: string
	identify: string
	last_feedback_address: string
	last_feedback_value: string
	[id: string]: string | number | undefined
}

const CORE_VARIABLES: Record<string, CompanionVariableDefinition> = {
	status_text: { name: 'Playback status text' },
	playing_cue: { name: 'Playing cue code' },
	playback_state: { name: 'Playback state' },
	master_level: { name: 'Master dimmer (0–1)' },
	master_percent: { name: 'Master dimmer (%)' },
	fixture_red: { name: 'Global fixture red (%)' },
	fixture_green: { name: 'Global fixture green (%)' },
	fixture_blue: { name: 'Global fixture blue (%)' },
	identify: { name: 'Identify blink' },
	last_feedback_address: { name: 'Last OSC feedback address' },
	last_feedback_value: { name: 'Last OSC feedback value' },
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const definitions: Record<string, CompanionVariableDefinition> = { ...CORE_VARIABLES }

	for (const code of parseCodeList(self.config.controlCodes)) {
		definitions[controlVariableId(code)] = { name: `Control Value ${code} (%)` }
	}

	self.setVariableDefinitions(definitions as CompanionVariableDefinitions<VariablesSchema>)
	self.setVariableValues(variableValuesFromState(self.state, parseCodeList(self.config.controlCodes)))
}
