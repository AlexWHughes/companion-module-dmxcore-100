/**
 * Minimal DMX Core OSC stand-in for local module testing.
 * Listens on UDP 8000 and sends status feedback to 127.0.0.1:9000.
 */
import dgram from 'node:dgram'

const listenPort = Number(process.env.OSC_PORT ?? 8000)
const feedbackHost = process.env.FEEDBACK_HOST ?? '127.0.0.1'
const feedbackPort = Number(process.env.FEEDBACK_PORT ?? 9000)

const socket = dgram.createSocket('udp4')
const state = {
	statusText: 'Stopped',
	cue: '',
	master: 1,
	red: 0,
	green: 0,
	blue: 0,
}

function pad4(length) {
	const rem = length % 4
	return rem === 0 ? 0 : 4 - rem
}

function writeString(value) {
	const body = Buffer.from(value, 'utf8')
	return Buffer.concat([body, Buffer.alloc(1 + pad4(body.length + 1))])
}

function readString(buffer, offset) {
	let end = offset
	while (end < buffer.length && buffer[end] !== 0) end++
	return { value: buffer.subarray(offset, end).toString('utf8'), offset: end + 1 + pad4(end - offset + 1) }
}

function encode(address, args = []) {
	const parts = [writeString(address)]
	let tags = ','
	const data = []
	for (const arg of args) {
		tags += arg.type
		if (arg.type === 'i') {
			const buf = Buffer.alloc(4)
			buf.writeInt32BE(arg.value, 0)
			data.push(buf)
		} else if (arg.type === 'f') {
			const buf = Buffer.alloc(4)
			buf.writeFloatBE(arg.value, 0)
			data.push(buf)
		} else {
			data.push(writeString(String(arg.value)))
		}
	}
	return Buffer.concat([parts[0], writeString(tags), ...data])
}

function decode(buffer) {
	const address = readString(buffer, 0)
	if (address.offset >= buffer.length) return { address: address.value, args: [] }
	const typeTag = readString(buffer, address.offset)
	let offset = typeTag.offset
	const args = []
	for (const tag of typeTag.value.slice(1)) {
		if (tag === 'i') {
			args.push(buffer.readInt32BE(offset))
			offset += 4
		} else if (tag === 'f') {
			args.push(buffer.readFloatBE(offset))
			offset += 4
		} else if (tag === 's') {
			const str = readString(buffer, offset)
			args.push(str.value)
			offset = str.offset
		}
	}
	return { address: address.value, args }
}

function sendFeedback() {
	const packets = [
		encode('/dmxcore/status/text', [{ type: 's', value: state.statusText }]),
		encode('/dmxcore/status/cue', [{ type: 's', value: state.cue }]),
		encode('/dmxcore/dimmer/master', [{ type: 'f', value: state.master }]),
		encode('/dmxcore/fixture/red', [{ type: 'f', value: state.red }]),
		encode('/dmxcore/fixture/green', [{ type: 'f', value: state.green }]),
		encode('/dmxcore/fixture/blue', [{ type: 'f', value: state.blue }]),
	]
	for (const packet of packets) {
		socket.send(packet, feedbackPort, feedbackHost)
	}
}

socket.on('message', (msg, rinfo) => {
	let parsed
	try {
		parsed = decode(msg)
	} catch (error) {
		console.warn('Bad OSC from', rinfo.address, error)
		return
	}

	console.log(`${rinfo.address}:${rinfo.port} ${parsed.address}`, parsed.args)
	const address = parsed.address
	const value = parsed.args[0]

	if (address === '/ping' || address === '/dmxcore/status') {
		sendFeedback()
		return
	}
	if (address === '/dmxcore/cuecontrol/stop') {
		state.cue = ''
		state.statusText = 'Stopped'
		sendFeedback()
		return
	}
	const cue = address.match(/^\/dmxcore\/cue\/(.+)$/i)
	if (cue) {
		state.cue = cue[1]
		state.statusText = `Playing '${cue[1]}'`
		sendFeedback()
		return
	}
	if (address === '/dmxcore/dimmer/master' || address === '/dmxcore/dimmer/master/fadeto') {
		if (typeof value === 'number') state.master = value
		sendFeedback()
		return
	}
	if (address === '/dmxcore/fixture/red' && typeof value === 'number') state.red = value
	if (address === '/dmxcore/fixture/green' && typeof value === 'number') state.green = value
	if (address === '/dmxcore/fixture/blue' && typeof value === 'number') state.blue = value
	sendFeedback()
})

socket.bind(listenPort, () => {
	console.log(`Mock DMX Core OSC on udp/${listenPort}, feedback → ${feedbackHost}:${feedbackPort}`)
})
