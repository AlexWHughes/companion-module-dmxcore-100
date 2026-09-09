import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { DEFAULT_HTTP_PORT, STATUS_POLL_MS, SUPPORTED_PROTOCOL_VERSION } from './constants.js'
import { IntegrationApiClient, IntegrationApiError } from './api.js'
import { IntegrationEventSocket } from './events.js'
import type { DeviceInfo, EntityState, ExecuteRequest, IntegrationEntity } from './entities.js'
import {
	applyStates,
	createInitialState,
	displayDeviceName,
	replaceCatalog,
	type DmxCoreState,
	variableValuesFromState,
} from './state.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	secrets: ModuleSecrets = { apiKey: '' }
	readonly state: DmxCoreState = createInitialState()

	#api: IntegrationApiClient | undefined
	#events: IntegrationEventSocket | undefined
	#connectGeneration = 0
	#statusPollTimer: ReturnType<typeof setInterval> | undefined

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
		this.config = this.#normaliseConfig(config)
		this.secrets = this.#normaliseSecrets(secrets)
		this.#exportDefinitions()
		await this.#startConnection()
	}

	async destroy(): Promise<void> {
		this.#stopConnection()
		this.log('debug', 'DMX Core connection closed')
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
		this.config = this.#normaliseConfig(config)
		this.secrets = this.#normaliseSecrets(secrets)
		this.#exportDefinitions()
		await this.#startConnection()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	async execute(request: ExecuteRequest, options?: { preferWs?: boolean }): Promise<boolean> {
		if (!this.#api) {
			this.log('warn', `Cannot execute ${request.command} on ${request.code}: not connected`)
			return false
		}

		try {
			if (options?.preferWs && this.#events?.sendExecute(request)) {
				// WS execute is fire-and-forget; the device does not ACK success (only error frames).
				// Return false so callers wait for state events before treating it as confirmed.
				this.log('debug', `WS execute ${request.command} ${request.code}`)
				return false
			}

			await this.#api.execute(request)
			this.log('debug', `HTTP execute ${request.command} ${request.code}`)
			return true
		} catch (error) {
			this.#handleApiError('execute', error)
			return false
		}
	}

	/** Optimistically update a level so rotary labels refresh before the WS state echo. */
	applyLocalLevel(code: string, level: number): void {
		applyStates(this.state, [{ code, level }], false)
		this.#publishState()
	}

	async refreshCatalog(): Promise<void> {
		if (!this.#api) {
			this.log('warn', 'Cannot refresh catalog: not connected')
			return
		}

		try {
			const [entities, states] = await Promise.all([this.#api.getCatalog(), this.#api.getState()])
			this.#onCatalog(entities)
			this.#onState(states, true)
			await this.#refreshStatus()
			this.log('info', `Refreshed catalog (${entities.length} entities)`)
		} catch (error) {
			this.#handleApiError('refresh', error)
		}
	}

	#normaliseConfig(config: ModuleConfig): ModuleConfig {
		return {
			host: config.host ?? '',
			port: config.port || DEFAULT_HTTP_PORT,
			useHttps: config.useHttps === true,
			allowInsecureTls: config.allowInsecureTls === true,
		}
	}

	#normaliseSecrets(secrets: ModuleSecrets | undefined): ModuleSecrets {
		return {
			apiKey: secrets?.apiKey ?? '',
		}
	}

	#exportDefinitions(): void {
		UpdateActions(this)
		UpdateFeedbacks(this)
		UpdatePresets(this)
		UpdateVariableDefinitions(this)
	}

	async #startConnection(): Promise<void> {
		this.#stopConnection()
		const generation = ++this.#connectGeneration

		const host = this.config.host.trim()
		const apiKey = this.secrets.apiKey.trim()

		if (!host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the DMX Core IP address')
			return
		}
		if (!apiKey) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the Integration API key')
			return
		}

		this.updateStatus(InstanceStatus.Connecting, `Contacting ${host}:${this.config.port}`)
		this.#api = new IntegrationApiClient({ config: this.config, apiKey })

		try {
			const info = await this.#api.getInfo()
			if (generation !== this.#connectGeneration) return

			this.#onHello(info)

			const [entities, states] = await Promise.all([this.#api.getCatalog(), this.#api.getState()])
			if (generation !== this.#connectGeneration) return

			this.#onCatalog(entities)
			this.#onState(states, true)
			await this.#refreshStatus()
			if (generation !== this.#connectGeneration) return
			this.#startStatusPoll()
		} catch (error) {
			if (generation !== this.#connectGeneration) return
			this.#api?.destroy()
			this.#api = undefined
			this.#handleApiError('connect', error)
			return
		}

		this.#events = new IntegrationEventSocket(this.config, apiKey, {
			onOpen: () => {
				this.log('debug', 'Integration API WebSocket open')
			},
			onHello: (info) => {
				this.#onHello(info)
				this.state.connected = true
				const label = displayDeviceName(this.state) || host
				this.updateStatus(InstanceStatus.Ok, `${label} (protocol ${info.protocolVersion})`)
				this.#publishState()
			},
			onCatalog: (entities) => this.#onCatalog(entities),
			onState: (states, full) => this.#onState(states, full),
			onError: (message) => {
				this.log('warn', `Integration API event error: ${message}`)
			},
			onClose: () => {
				this.state.connected = false
				this.#publishState()
				if (this.#api) {
					this.updateStatus(InstanceStatus.Connecting, 'WebSocket reconnecting…')
				}
			},
			log: (level, message) => this.log(level, message),
		})
		this.#events.start()
	}

	#stopConnection(): void {
		this.#connectGeneration++
		this.#stopStatusPoll()
		this.#events?.stop()
		this.#events = undefined
		this.#api?.destroy()
		this.#api = undefined
		this.state.connected = false
		this.state.info = null
		this.state.status = null
	}

	#startStatusPoll(): void {
		this.#stopStatusPoll()
		this.#statusPollTimer = setInterval(() => {
			void this.#refreshStatus()
		}, STATUS_POLL_MS)
	}

	#stopStatusPoll(): void {
		if (this.#statusPollTimer) {
			clearInterval(this.#statusPollTimer)
			this.#statusPollTimer = undefined
		}
	}

	async #refreshStatus(): Promise<void> {
		if (!this.#api) return
		try {
			this.state.status = await this.#api.getStatus()
			this.#publishState()
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.log('debug', `Device /api/status unavailable: ${message}`)
		}
	}

	#onHello(info: DeviceInfo): void {
		this.state.info = info
		if (info.protocolVersion > SUPPORTED_PROTOCOL_VERSION) {
			this.log(
				'warn',
				`Device protocolVersion ${info.protocolVersion} is newer than supported ${SUPPORTED_PROTOCOL_VERSION}`,
			)
		}
	}

	#onCatalog(entities: IntegrationEntity[]): void {
		replaceCatalog(this.state, entities)
		this.#exportDefinitions()
		this.#publishState()
	}

	#onState(states: EntityState[], full: boolean): void {
		applyStates(this.state, states, full)
		this.#publishState()
	}

	#publishState(): void {
		this.setVariableValues(variableValuesFromState(this.state))
		this.checkFeedbacks(
			'connectionOk',
			'nowPlaying',
			'switchOn',
			'switchOff',
			'levelAtLeast',
			'levelAtMost',
			'choiceEquals',
			'sensorContains',
		)
	}

	#handleApiError(context: string, error: unknown): void {
		const message = error instanceof Error ? error.message : String(error)
		this.log('error', `Integration API ${context} failed: ${message}`)

		// Command validation errors should not mark the whole connection as down.
		if (context === 'execute' && error instanceof IntegrationApiError && error.status >= 400 && error.status < 500) {
			if (error.status === 401 || error.status === 403) {
				this.updateStatus(InstanceStatus.AuthenticationFailure, message)
			}
			return
		}

		if (error instanceof IntegrationApiError && (error.status === 401 || error.status === 403)) {
			this.updateStatus(InstanceStatus.AuthenticationFailure, message)
			return
		}
		if (error instanceof IntegrationApiError && error.status === 404) {
			this.updateStatus(InstanceStatus.ConnectionFailure, 'Integration API not found (enable it under Device → System)')
			return
		}

		this.updateStatus(InstanceStatus.ConnectionFailure, message)
	}
}
