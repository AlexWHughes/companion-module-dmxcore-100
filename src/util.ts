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

/** Button-safe percent label. Unknown levels stay blank (not 0%) so other faders aren’t shown as muted. */
export function formatPercentUnit(level: number | null): string {
	if (level === null) return ''
	return `${formatPercent(level)}%`
}
