import type { SomeCompanionConfigField } from '@companion-module/base'
import { DEFAULT_FEEDBACK_PORT, DEFAULT_OSC_PORT, DEFAULT_PING_INTERVAL_SEC } from './constants.js'

export type ModuleConfig = {
	host: string
	port: number
	listenForFeedback: boolean
	feedbackPort: number
	pingInterval: number
	controlCodes: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Connection',
			width: 12,
			value:
				'Send OSC to the DMX Core 100 (default UDP 8000). For live button feedback, add this Companion machine under Control & Integrations → OSC Clients, using the feedback port below, and do not bind that client to an OSC control surface.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'DMX Core IP / hostname',
			width: 8,
		},
		{
			type: 'number',
			id: 'port',
			label: 'OSC port',
			width: 4,
			min: 1,
			max: 65535,
			default: DEFAULT_OSC_PORT,
			tooltip: 'Device → System → OSC Port in the DMX Core Web UI. Restart the device after changing it.',
		},
		{
			type: 'checkbox',
			id: 'listenForFeedback',
			label: 'Listen for OSC feedback',
			width: 8,
			default: true,
			disableAutoExpression: true,
		},
		{
			type: 'number',
			id: 'feedbackPort',
			label: 'Feedback listen port',
			width: 4,
			min: 1,
			max: 65535,
			default: DEFAULT_FEEDBACK_PORT,
			isVisibleExpression: '$(options:listenForFeedback) === true',
		},
		{
			type: 'number',
			id: 'pingInterval',
			label: 'Keep-alive /ping interval (seconds)',
			width: 6,
			min: 0,
			max: 300,
			default: DEFAULT_PING_INTERVAL_SEC,
			tooltip: 'Sends /ping so DMX Core keeps this controller registered for feedback. 0 disables keep-alive.',
		},
		{
			type: 'textinput',
			id: 'controlCodes',
			label: 'Control Value codes to track',
			width: 12,
			default: '',
			tooltip:
				'Optional comma-separated Level-kind Control Value codes. Each becomes a variable such as $(control_dsp1) and can be used with Set Control Value.',
		},
	]
}
