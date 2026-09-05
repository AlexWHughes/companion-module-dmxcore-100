export const DEFAULT_OSC_PORT = 8000
export const DEFAULT_FEEDBACK_PORT = 9000
export const DEFAULT_PING_INTERVAL_SEC = 10
export const FEEDBACK_WAIT_MS = 15000

export const Colors = {
	White: 0xffffff,
	Black: 0x000000,
	Dark: 0x141414,
	Play: 0x1b4f72,
	Playing: 0x1e8449,
	Stop: 0x7b241c,
	Stopped: 0x922b21,
	Preset: 0x4a235a,
	Effect: 0xa04000,
	Master: 0xb9770e,
	MasterOff: 0x2c2c2c,
	Identify: 0x1a5276,
	IdentifyOn: 0xf1c40f,
	Status: 0x17202a,
	Custom: 0x1c2833,
} as const

export const GlobalColorChannels = ['red', 'green', 'blue'] as const
export type GlobalColorChannel = (typeof GlobalColorChannels)[number]

export const FixtureChannels = ['dimmer', 'red', 'green', 'blue', 'white'] as const
export type FixtureChannel = (typeof FixtureChannels)[number]

export const IdentifyModes = ['on', 'off', 'toggle'] as const
export type IdentifyMode = (typeof IdentifyModes)[number]

export const CustomArgTypes = ['none', 'float', 'integer', 'string'] as const
export type CustomArgType = (typeof CustomArgTypes)[number]
