import {
	InstanceBase,
	InstanceStatus,
	type SharedUdpSocket,
	type SomeCompanionConfigField,
} from '@companion-module/base'
import type { RemoteInfo } from 'node:dgram'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { DEFAULT_FEEDBACK_PORT, DEFAULT_OSC_PORT, FEEDBACK_WAIT_MS } from './constants.js'
import { decodeOscPacket, encodeOscMessage, flattenOscPackets, OscAddress, toOscSendArgs, type OscArg } from './osc.js'
import { applyOscMessage, createInitialState, type DmxCoreState, variableValuesFromState } from './state.js'
import { parseCodeList } from './util.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	readonly state: DmxCoreState = createInitialState()

	#socket: SharedUdpSocket | undefined
	#pingTimer: ReturnType<typeof setInterval> | undefined
	#feedbackTimer: ReturnType<typeof setTimeout> | undefined
	#receivedFeedback = false

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = this.#normaliseConfig(config)
		this.#exportDefinitions()
		this.#startConnection()
	}

	async destroy(): Promise<void> {
		this.#stopConnection()
		this.log('debug', 'DMX Core connection closed')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = this.#normaliseConfig(config)
		this.#exportDefinitions()
		this.#startConnection()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	sendCommand(path: string, args: OscArg[] = [], statePatch?: Partial<DmxCoreState>): void {
		const host = this.config.host.trim()
		if (!host) {
			this.log('warn', `Cannot send ${path}: no DMX Core host configured`)
			return
		}

		if (statePatch) {
			Object.assign(this.state, statePatch)
			this.#publishState()
		}

		const port = this.config.port
		try {
			if (this.#socket) {
				const packet = encodeOscMessage(path, args)
				this.#socket.send(packet, port, host)
			} else {
				this.oscSend(host, port, path, toOscSendArgs(args))
			}
			this.log('debug', `OSC → ${host}:${port} ${path} ${args.map((arg) => `${arg.type}:${arg.value}`).join(' ')}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.log('error', `Failed to send OSC ${path}: ${message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, message)
		}
	}

	#normaliseConfig(config: ModuleConfig): ModuleConfig {
		return {
			host: config.host ?? '',
			port: config.port || DEFAULT_OSC_PORT,
			listenForFeedback: config.listenForFeedback !== false,
			feedbackPort: config.feedbackPort || DEFAULT_FEEDBACK_PORT,
			pingInterval: config.pingInterval ?? 10,
			controlCodes: config.controlCodes ?? '',
		}
	}

	#exportDefinitions(): void {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdatePresets(this)
		UpdateVariableDefinitions(this)
	}

	#startConnection(): void {
		this.#stopConnection()

		if (!this.config.host.trim()) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the DMX Core IP address')
			return
		}

		if (!this.config.listenForFeedback) {
			this.updateStatus(InstanceStatus.Ok, 'Sending OSC (feedback disabled)')
			this.#sendKeepalive()
			this.#startPingTimer()
			return
		}

		this.updateStatus(InstanceStatus.Connecting, `Listening for feedback on UDP ${this.config.feedbackPort}`)
		this.#socket = this.createSharedUdpSocket('udp4', (msg, rinfo) => this.#onMessage(msg, rinfo))
		this.#socket.on('error', (error) => {
			this.log('error', `OSC listen error: ${error.message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, error.message)
		})
		this.#socket.on('listening', () => {
			this.log('info', `Listening for DMX Core OSC feedback on UDP ${this.config.feedbackPort}`)
			this.#sendKeepalive()
			this.#startPingTimer()
			this.#feedbackTimer = setTimeout(() => {
				if (!this.#receivedFeedback) {
					this.updateStatus(
						InstanceStatus.UnknownWarning,
						'No OSC feedback yet. Add this Companion IP as an OSC Client on the DMX Core (feedback port must match).',
					)
				}
			}, FEEDBACK_WAIT_MS)
		})
		this.#socket.bind(this.config.feedbackPort)
	}

	#stopConnection(): void {
		if (this.#pingTimer) {
			clearInterval(this.#pingTimer)
			this.#pingTimer = undefined
		}
		if (this.#feedbackTimer) {
			clearTimeout(this.#feedbackTimer)
			this.#feedbackTimer = undefined
		}

		this.#receivedFeedback = false

		const socket = this.#socket
		this.#socket = undefined
		if (socket) {
			try {
				socket.close()
			} catch (error) {
				this.log('debug', `Error closing OSC socket: ${error instanceof Error ? error.message : String(error)}`)
			}
		}
	}

	#startPingTimer(): void {
		const seconds = this.config.pingInterval
		if (!seconds || seconds <= 0) return

		this.#pingTimer = setInterval(() => {
			this.sendCommand(OscAddress.ping)
		}, seconds * 1000)
	}

	#sendKeepalive(): void {
		this.sendCommand(OscAddress.ping)
		this.sendCommand(OscAddress.status)
	}

	#onMessage(msg: Buffer, rinfo: RemoteInfo): void {
		try {
			const packet = decodeOscPacket(msg)
			const messages = flattenOscPackets(packet)
			if (messages.length === 0) return

			this.#receivedFeedback = true
			if (this.#feedbackTimer) {
				clearTimeout(this.#feedbackTimer)
				this.#feedbackTimer = undefined
			}
			this.updateStatus(InstanceStatus.Ok, `${rinfo.address}:${rinfo.port}`)

			for (const message of messages) {
				this.log('debug', `OSC ← ${message.address} ${message.args.map((arg) => String(arg.value)).join(' ')}`)
				applyOscMessage(this.state, message)
			}

			this.#publishState()
		} catch (error) {
			this.log(
				'debug',
				`Ignoring OSC packet from ${rinfo.address}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	#publishState(): void {
		this.setVariableValues(variableValuesFromState(this.state, parseCodeList(this.config.controlCodes)))
		this.checkFeedbacks(
			'cuePlaying',
			'playbackStopped',
			'identifyOn',
			'masterAtLeast',
			'masterAtMost',
			'controlAtLeast',
			'statusContains',
		)
	}
}
