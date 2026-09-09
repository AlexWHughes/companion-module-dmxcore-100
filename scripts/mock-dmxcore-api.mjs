/**
 * Local Integration API mock for Companion module development.
 * Listens on http://127.0.0.1:8080/api/integration/v1
 * Auth: Authorization: Bearer test-key
 */
import http from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT || 8080)
const API_KEY = process.env.API_KEY || 'test-key'
const PREFIX = '/api/integration/v1'

const catalog = [
	{ code: 'cue.INTRO', name: 'Intro', kind: 'scene' },
	{ code: 'cue.OUTRO', name: 'Outro', kind: 'scene' },
	{ code: 'preset.PARTY', name: 'Party', kind: 'switch' },
	{ code: 'system.mute', name: 'Mute', kind: 'switch' },
	{ code: 'system.masterdimmer', name: 'Master Dimmer', kind: 'level' },
	{ code: 'zone.BAR', name: 'Bar Zone', kind: 'level' },
	{ code: 'look.Mode', name: 'Mode', kind: 'select', choices: ['A', 'B', 'C'] },
	{ code: 'system.stop', name: 'Stop', kind: 'button' },
	{ code: 'system.clearambient', name: 'Clear Ambient', kind: 'button' },
	{ code: 'system.nowplaying', name: 'Now Playing', kind: 'sensor' },
]

/** @type {Map<string, { code: string, isOn?: boolean, level?: number, choice?: string, text?: string }>} */
const states = new Map([
	['preset.PARTY', { code: 'preset.PARTY', isOn: false }],
	['system.mute', { code: 'system.mute', isOn: false }],
	['system.masterdimmer', { code: 'system.masterdimmer', level: 1 }],
	['zone.BAR', { code: 'zone.BAR', level: 0.5 }],
	['look.Mode', { code: 'look.Mode', choice: 'A' }],
	['system.nowplaying', { code: 'system.nowplaying', text: '' }],
])

/** @type {import('ws').WebSocket[]} */
const clients = []

function unauthorized(res) {
	res.writeHead(401, { 'Content-Type': 'application/json' })
	res.end(JSON.stringify({ error: 'unauthorized' }))
}

function readJson(req) {
	return new Promise((resolve, reject) => {
		const chunks = []
		req.on('data', (c) => chunks.push(c))
		req.on('end', () => {
			try {
				const raw = Buffer.concat(chunks).toString('utf8')
				resolve(raw ? JSON.parse(raw) : {})
			} catch (error) {
				reject(error)
			}
		})
		req.on('error', reject)
	})
}

function authOk(req) {
	const header = req.headers.authorization || ''
	return header === `Bearer ${API_KEY}`
}

function allStates() {
	return [...states.values()]
}

function broadcast(frame) {
	const data = JSON.stringify(frame)
	for (const client of clients) {
		if (client.readyState === 1) client.send(data)
	}
}

function applyExecute(body) {
	const code = String(body.code || '')
	const command = String(body.command || '')
	const entity = catalog.find((e) => e.code === code)
	if (!entity) {
		return { status: 404, error: 'unknown code' }
	}

	const current = states.get(code) || { code }

	switch (entity.kind) {
		case 'scene':
		case 'button':
			if (command !== 'activate') return { status: 400, error: 'invalid command' }
			if (entity.kind === 'scene') {
				states.set('system.nowplaying', { code: 'system.nowplaying', text: code })
				broadcast({ type: 'state', states: [{ code: 'system.nowplaying', text: code }] })
			} else if (code === 'system.stop') {
				states.set('system.nowplaying', { code: 'system.nowplaying', text: '' })
				broadcast({ type: 'state', states: [{ code: 'system.nowplaying', text: '' }] })
			}
			return { status: 202 }
		case 'switch': {
			if (command !== 'turnOn' && command !== 'turnOff' && command !== 'toggle') {
				return { status: 400, error: 'invalid command' }
			}
			const next = command === 'turnOn' ? true : command === 'turnOff' ? false : !(current.isOn === true)
			const state = { code, isOn: next }
			states.set(code, state)
			broadcast({ type: 'state', states: [state] })
			return { status: 202 }
		}
		case 'level': {
			if (command !== 'setLevel' || typeof body.level !== 'number') {
				return { status: 400, error: 'invalid command' }
			}
			const state = { code, level: Math.min(1, Math.max(0, body.level)) }
			states.set(code, state)
			broadcast({ type: 'state', states: [state] })
			return { status: 202 }
		}
		case 'select': {
			if (command !== 'setChoice' || typeof body.choice !== 'string') {
				return { status: 400, error: 'invalid command' }
			}
			const state = { code, choice: body.choice }
			states.set(code, state)
			broadcast({ type: 'state', states: [state] })
			return { status: 202 }
		}
		case 'sensor':
			return { status: 400, error: 'invalid command' }
		default:
			return { status: 400, error: 'invalid command' }
	}
}

const server = http.createServer(async (req, res) => {
	if (!req.url || !req.method) {
		res.writeHead(400)
		res.end()
		return
	}

	const url = new URL(req.url, `http://127.0.0.1:${PORT}`)

	if (req.method === 'GET' && url.pathname === '/api/status') {
		res.writeHead(200, { 'Content-Type': 'application/json' })
		res.end(
			JSON.stringify({
				hostName: 'mock-host',
				deviceNickname: 'Mock Device',
				appVersion: '0.0.0-mock',
				sysCpuUsage: 12.5,
				appCpuUsage: 8.1,
				sysMemoryUsageMB: 512,
				sysMemoryTotalMB: 4096,
				appMemoryUsageMB: 256,
				storageUsageMB: 1024,
				storageTotalMB: 32000,
				cpuTemperatureC: 45.2,
				boardTemperatureC: 38.0,
				audioAvailable: true,
				networkSpeedMbit: 1000,
				playerName: null,
				playerCode: null,
				appUpTimeH: 1.5,
				sysUpTimeH: 24.0,
				showName: 'Mock Show',
				recorder: 'INACTIVE',
				schedules: [],
			}),
		)
		return
	}

	if (!url.pathname.startsWith(PREFIX)) {
		res.writeHead(404, { 'Content-Type': 'application/json' })
		res.end(JSON.stringify({ error: 'not found' }))
		return
	}

	if (!authOk(req)) {
		unauthorized(res)
		return
	}

	const path = url.pathname.slice(PREFIX.length) || '/'

	try {
		if (req.method === 'GET' && path === '/info') {
			res.writeHead(200, { 'Content-Type': 'application/json' })
			res.end(
				JSON.stringify({
					protocolVersion: 1,
					serial: 'MOCK-001',
					product: 'DMX Core 100',
					deviceName: 'Mock Device',
					softwareVersion: '0.0.0-mock',
				}),
			)
			return
		}

		if (req.method === 'GET' && path === '/catalog') {
			res.writeHead(200, { 'Content-Type': 'application/json' })
			res.end(JSON.stringify({ entities: catalog }))
			return
		}

		if (req.method === 'GET' && path === '/state') {
			res.writeHead(200, { 'Content-Type': 'application/json' })
			res.end(JSON.stringify({ states: allStates() }))
			return
		}

		if (req.method === 'GET' && path.startsWith('/state/')) {
			const code = decodeURIComponent(path.slice('/state/'.length))
			const state = states.get(code)
			if (!state) {
				res.writeHead(404, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify({ error: 'unknown code' }))
				return
			}
			res.writeHead(200, { 'Content-Type': 'application/json' })
			res.end(JSON.stringify(state))
			return
		}

		if (req.method === 'POST' && path === '/execute') {
			const body = await readJson(req)
			const result = applyExecute(body)
			res.writeHead(result.status, { 'Content-Type': 'application/json' })
			res.end(result.error ? JSON.stringify({ error: result.error }) : '')
			return
		}

		res.writeHead(404, { 'Content-Type': 'application/json' })
		res.end(JSON.stringify({ error: 'not found' }))
	} catch (error) {
		res.writeHead(400, { 'Content-Type': 'application/json' })
		res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
	}
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
	const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)
	if (url.pathname !== `${PREFIX}/events`) {
		socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
		socket.destroy()
		return
	}
	if (!authOk(req)) {
		socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
		socket.destroy()
		return
	}

	wss.handleUpgrade(req, socket, head, (ws) => {
		clients.push(ws)
		ws.send(
			JSON.stringify({
				type: 'hello',
				protocolVersion: 1,
				serial: 'MOCK-001',
				product: 'DMX Core 100',
				deviceName: 'Mock Device',
				softwareVersion: '0.0.0-mock',
			}),
		)
		ws.send(JSON.stringify({ type: 'catalog', entities: catalog }))
		ws.send(JSON.stringify({ type: 'state', states: allStates() }))

		ws.on('message', (raw) => {
			let frame
			try {
				frame = JSON.parse(String(raw))
			} catch {
				ws.send(JSON.stringify({ type: 'error', error: 'invalid json' }))
				return
			}

			if (frame?.type === 'ping') {
				ws.send(JSON.stringify({ type: 'pong' }))
				return
			}

			if (frame?.type === 'execute') {
				const result = applyExecute(frame)
				if (result.error) ws.send(JSON.stringify({ type: 'error', error: result.error }))
				return
			}
		})

		ws.on('close', () => {
			const index = clients.indexOf(ws)
			if (index >= 0) clients.splice(index, 1)
		})
	})
})

server.listen(PORT, '127.0.0.1', () => {
	console.log(`Mock Integration API on http://127.0.0.1:${PORT}${PREFIX}`)
	console.log(`API key: ${API_KEY}`)
	console.log(`WebSocket: ws://127.0.0.1:${PORT}${PREFIX}/events`)
})
