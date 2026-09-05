import type { IdentifyMode } from './constants.js'

export function assertNever(value: never, message = 'Unexpected value'): never {
	throw new Error(`${message}: ${String(value)}`)
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

export function percentToLevel(percent: number): number {
	return clamp(percent / 100, 0, 1)
}

export function levelToPercent(level: number): number {
	return Math.round(clamp(level, 0, 1) * 1000) / 10
}

export function formatPercent(level: number | null): string {
	if (level === null) return ''
	const percent = levelToPercent(level)
	return Number.isInteger(percent) ? String(percent) : percent.toFixed(1)
}

export function parseCodeList(raw: string | undefined): string[] {
	if (!raw) return []

	const seen = new Set<string>()
	const codes: string[] = []
	for (const part of raw.split(/[,;\n]+/)) {
		const code = part.trim()
		if (!code || seen.has(code)) continue
		seen.add(code)
		codes.push(code)
	}
	return codes
}

export function controlVariableId(code: string): string {
	const safe = code
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
	return `control_${safe || 'value'}`
}

export function nextIdentifyState(mode: IdentifyMode, current: boolean): boolean {
	switch (mode) {
		case 'on':
			return true
		case 'off':
			return false
		case 'toggle':
			return !current
		default:
			return assertNever(mode)
	}
}
