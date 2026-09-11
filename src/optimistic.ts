/** Prior level before the first unconfirmed optimistic setLevel for an entity code. */
export type PendingOptimisticLevels = Map<string, number | null>

/**
 * Remember the pre-optimistic level once per code until the device confirms or we roll back.
 * Later ticks on the same code keep the original prior so a rejection restores the last known-good value.
 */
export function trackOptimisticSetLevel(
	pending: PendingOptimisticLevels,
	code: string,
	currentLevel: number | null,
): void {
	if (!code || pending.has(code)) return
	pending.set(code, currentLevel)
}

/** Device state echo for this code confirms or replaces the optimistic value. */
export function confirmOptimisticSetLevel(pending: PendingOptimisticLevels, code: string): void {
	pending.delete(code)
}

export function confirmOptimisticSetLevels(pending: PendingOptimisticLevels, codes: Iterable<string>): void {
	for (const code of codes) pending.delete(code)
}

/**
 * Take the rollback prior for a rejected execute. `undefined` means nothing was pending.
 * `null` means pending but the prior level was unknown — caller should refresh device state.
 */
export function takeOptimisticRollback(pending: PendingOptimisticLevels, code: string): number | null | undefined {
	if (!pending.has(code)) return undefined
	const prior = pending.get(code) ?? null
	pending.delete(code)
	return prior
}

export function takeAllOptimisticRollbacks(
	pending: PendingOptimisticLevels,
): Array<{ code: string; priorLevel: number | null }> {
	const rollbacks = [...pending.entries()].map(([code, priorLevel]) => ({ code, priorLevel }))
	pending.clear()
	return rollbacks
}
