import type { OSCSomeArguments } from '@companion-module/base'
import { assertNever } from './util.js'

export type OscArgType = 'i' | 'f' | 's'

export type OscArg = { type: 'i'; value: number } | { type: 'f'; value: number } | { type: 's'; value: string }

export interface OscMessage {
	address: string
	args: OscArg[]
}

export interface OscBundle {
	timetag: bigint
	packets: Array<OscMessage | OscBundle>
}

export function isOscBundle(packet: OscMessage | OscBundle): packet is OscBundle {
	return 'packets' in packet
}

function pad4(length: number): number {
	const remainder = length % 4
	return remainder === 0 ? 0 : 4 - remainder
}

function writePaddedString(parts: Buffer[], value: string): void {
	const body = Buffer.from(value, 'utf8')
	const padding = pad4(body.length + 1)
	parts.push(body, Buffer.alloc(1 + padding))
}

function readPaddedString(buffer: Buffer, offset: number): { value: string; offset: number } {
	if (offset >= buffer.length) {
		throw new Error('Unexpected end of OSC string')
	}

	let end = offset
	while (end < buffer.length && buffer[end] !== 0) {
		end++
	}
	if (end >= buffer.length) {
		throw new Error('Unterminated OSC string')
	}

	const value = buffer.subarray(offset, end).toString('utf8')
	return { value, offset: end + 1 + pad4(end - offset + 1) }
}

export function encodeOscMessage(address: string, args: OscArg[] = []): Buffer {
	if (!address.startsWith('/')) {
		throw new Error(`OSC address must start with /: ${address}`)
	}

	const parts: Buffer[] = []
	writePaddedString(parts, address)

	let typeTag = ','
	const argParts: Buffer[] = []
	for (const arg of args) {
		switch (arg.type) {
			case 'i': {
				typeTag += 'i'
				const buf = Buffer.alloc(4)
				buf.writeInt32BE(Math.trunc(arg.value), 0)
				argParts.push(buf)
				break
			}
			case 'f': {
				typeTag += 'f'
				const buf = Buffer.alloc(4)
				buf.writeFloatBE(arg.value, 0)
				argParts.push(buf)
				break
			}
			case 's': {
				typeTag += 's'
				writePaddedString(argParts, arg.value)
				break
			}
			default:
				assertNever(arg)
		}
	}

	writePaddedString(parts, typeTag)
	return Buffer.concat([...parts, ...argParts])
}

export function decodeOscPacket(buffer: Buffer): OscMessage | OscBundle {
	if (buffer.length < 4) {
		throw new Error('OSC packet is too short')
	}

	if (buffer[0] === 35 /* # */) {
		return decodeBundle(buffer, 0).packet
	}

	return decodeMessage(buffer, 0).packet
}

function decodeMessage(buffer: Buffer, offset: number): { packet: OscMessage; offset: number } {
	const address = readPaddedString(buffer, offset)
	if (!address.value.startsWith('/')) {
		throw new Error(`Invalid OSC address: ${address.value}`)
	}

	offset = address.offset
	if (offset >= buffer.length) {
		return { packet: { address: address.value, args: [] }, offset }
	}

	const typeTag = readPaddedString(buffer, offset)
	offset = typeTag.offset
	const args: OscArg[] = []

	const tags = typeTag.value.startsWith(',') ? typeTag.value.slice(1) : typeTag.value
	for (const tag of tags) {
		switch (tag) {
			case 'i': {
				if (offset + 4 > buffer.length) throw new Error('Truncated OSC int')
				args.push({ type: 'i', value: buffer.readInt32BE(offset) })
				offset += 4
				break
			}
			case 'f': {
				if (offset + 4 > buffer.length) throw new Error('Truncated OSC float')
				args.push({ type: 'f', value: buffer.readFloatBE(offset) })
				offset += 4
				break
			}
			case 's': {
				const str = readPaddedString(buffer, offset)
				args.push({ type: 's', value: str.value })
				offset = str.offset
				break
			}
			case 'T':
				args.push({ type: 'i', value: 1 })
				break
			case 'F':
				args.push({ type: 'i', value: 0 })
				break
			case 'N':
				break
			default:
				throw new Error(`Unsupported OSC type tag: ${tag}`)
		}
	}

	return { packet: { address: address.value, args }, offset }
}

function decodeBundle(buffer: Buffer, offset: number): { packet: OscBundle; offset: number } {
	const header = readPaddedString(buffer, offset)
	if (header.value !== '#bundle') {
		throw new Error(`Invalid OSC bundle header: ${header.value}`)
	}

	offset = header.offset
	if (offset + 8 > buffer.length) {
		throw new Error('Truncated OSC bundle timetag')
	}

	const timetag = buffer.readBigUInt64BE(offset)
	offset += 8

	const packets: Array<OscMessage | OscBundle> = []
	while (offset < buffer.length) {
		if (offset + 4 > buffer.length) {
			throw new Error('Truncated OSC bundle element size')
		}
		const size = buffer.readInt32BE(offset)
		offset += 4
		if (size < 0 || offset + size > buffer.length) {
			throw new Error('Invalid OSC bundle element size')
		}

		const element = buffer.subarray(offset, offset + size)
		offset += size
		packets.push(decodeOscPacket(element))
	}

	return { packet: { timetag, packets }, offset }
}

export function flattenOscPackets(packet: OscMessage | OscBundle): OscMessage[] {
	if (!isOscBundle(packet)) return [packet]

	const messages: OscMessage[] = []
	for (const child of packet.packets) {
		messages.push(...flattenOscPackets(child))
	}
	return messages
}

export function oscArgValue(arg: OscArg | undefined): string | number | undefined {
	return arg?.value
}

export function numericArg(args: OscArg[], index = 0): number | undefined {
	const value = oscArgValue(args[index])
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value)
		if (Number.isFinite(parsed)) return parsed
	}
	return undefined
}

export function stringArg(args: OscArg[], index = 0): string | undefined {
	const value = oscArgValue(args[index])
	if (typeof value === 'string') return value
	if (typeof value === 'number') return String(value)
	return undefined
}

export function toOscSendArgs(args: OscArg[]): OSCSomeArguments {
	return args
}

export const OscAddress = {
	ping: '/ping',
	status: '/dmxcore/status',
	blink: '/dmxcore/blink',
	stop: '/dmxcore/cuecontrol/stop',
	cue: (code: string): string => `/dmxcore/cue/${code}`,
	preset: (code: string): string => `/dmxcore/preset/${code}`,
	effect: (code: string): string => `/dmxcore/effect/${code}`,
	effectNone: '/dmxcore/effect/none',
	master: '/dmxcore/dimmer/master',
	masterFadeTo: '/dmxcore/dimmer/master/fadeto',
	zone: (code: string): string => `/dmxcore/dimmer/zone/${code}`,
	control: (code: string): string => `/dmxcore/control/${code}`,
	globalColor: (channel: 'red' | 'green' | 'blue'): string => `/dmxcore/fixture/${channel}`,
	fixture: (code: string, channel: string): string => `/dmxcore/fixture/${code}/${channel}`,
	fadeDuration: '/dmxcore/config/fadeduration',
	statusText: '/dmxcore/status/text',
	statusCue: '/dmxcore/status/cue',
} as const

export function parseControlFeedbackAddress(address: string): string | undefined {
	const match = /^\/dmxcore\/control\/(.+)$/i.exec(address)
	return match?.[1]
}
