import { formatPercent, controlVariableId, parseCodeList } from './util.js'
import type { OscArg, OscMessage } from './osc.js'
import { numericArg, OscAddress, parseControlFeedbackAddress, stringArg } from './osc.js'

export interface DmxCoreState {
	statusText: string
	playingCue: string
	master: number | null
	fixtureRed: number | null
	fixtureGreen: number | null
	fixtureBlue: number | null
	identify: boolean
	controlValues: Record<string, number>
	lastFeedbackAddress: string
	lastFeedbackValue: string
	lastFeedbackAt: number | null
}

export function createInitialState(): DmxCoreState {
	return {
		statusText: '',
		playingCue: '',
		master: null,
		fixtureRed: null,
		fixtureGreen: null,
		fixtureBlue: null,
		identify: false,
		controlValues: {},
		lastFeedbackAddress: '',
		lastFeedbackValue: '',
		lastFeedbackAt: null,
	}
}

function formatArgs(args: OscArg[]): string {
	return args.map((arg) => String(arg.value)).join(' ')
}

export function applyOscMessage(state: DmxCoreState, message: OscMessage): void {
	state.lastFeedbackAddress = message.address
	state.lastFeedbackValue = formatArgs(message.args)
	state.lastFeedbackAt = Date.now()

	const address = message.address.toLowerCase()

	if (address === OscAddress.statusText) {
		state.statusText = stringArg(message.args) ?? ''
		return
	}

	if (address === OscAddress.statusCue) {
		state.playingCue = stringArg(message.args) ?? ''
		return
	}

	if (address === OscAddress.master) {
		const level = numericArg(message.args)
		if (level !== undefined) state.master = level
		return
	}

	if (address === OscAddress.globalColor('red')) {
		const level = numericArg(message.args)
		if (level !== undefined) state.fixtureRed = level
		return
	}

	if (address === OscAddress.globalColor('green')) {
		const level = numericArg(message.args)
		if (level !== undefined) state.fixtureGreen = level
		return
	}

	if (address === OscAddress.globalColor('blue')) {
		const level = numericArg(message.args)
		if (level !== undefined) state.fixtureBlue = level
		return
	}

	const controlCode = parseControlFeedbackAddress(message.address)
	if (controlCode) {
		const level = numericArg(message.args)
		if (level !== undefined) {
			state.controlValues[controlCode.toLowerCase()] = level
		}
	}
}

export function variableValuesFromState(
	state: DmxCoreState,
	controlCodes: string[],
): Record<string, string | number | undefined> {
	const values: Record<string, string | number | undefined> = {
		status_text: state.statusText,
		playing_cue: state.playingCue,
		playback_state: state.playingCue ? 'Playing' : state.statusText || 'Unknown',
		master_level: state.master === null ? '' : String(state.master),
		master_percent: formatPercent(state.master),
		fixture_red: formatPercent(state.fixtureRed),
		fixture_green: formatPercent(state.fixtureGreen),
		fixture_blue: formatPercent(state.fixtureBlue),
		identify: state.identify ? 'On' : 'Off',
		last_feedback_address: state.lastFeedbackAddress,
		last_feedback_value: state.lastFeedbackValue,
	}

	for (const code of parseCodeList(controlCodes.join(','))) {
		const level = state.controlValues[code.toLowerCase()]
		values[controlVariableId(code)] = level === undefined ? '' : formatPercent(level)
	}

	return values
}

export function isCuePlaying(state: DmxCoreState, code: string): boolean {
	if (!state.playingCue) return false
	if (!code) return true
	return state.playingCue === code
}
