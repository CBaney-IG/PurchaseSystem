export interface MatrixEntry {
  level: number
  min_amount: number
  max_amount: number | null
  approver_role: string
  require_all: boolean
  escalate_hours: number
  active?: boolean
}

/**
 * Returns the approval levels required for a given amount, in ascending order.
 *
 * A level is required if the amount exceeds the previous level's ceiling.
 * Iteration stops at the first level whose max_amount >= amount (or is null),
 * which becomes the final approver.
 *
 * Example (IT Hardware, L1 max=5000, L2 max=25000, L3 max=null):
 *   R3,000  → [L1]        (within L1 ceiling)
 *   R6,000  → [L1, L2]    (exceeds L1, within L2 — AC-02)
 *   R30,000 → [L1, L2, L3]
 */
export function getRequiredLevels(matrix: MatrixEntry[], amount: number): MatrixEntry[] {
  const active = matrix.filter(e => e.active !== false).sort((a, b) => a.level - b.level)
  const required: MatrixEntry[] = []

  for (const entry of active) {
    required.push(entry)
    if (entry.max_amount === null || amount <= entry.max_amount) break
  }

  return required
}

/**
 * Returns the next level that still needs approval after currentLevel,
 * or null if all required levels have been satisfied.
 */
export function getNextRequiredLevel(
  matrix: MatrixEntry[],
  currentLevel: number,
  amount: number
): MatrixEntry | null {
  const required = getRequiredLevels(matrix, amount)
  return required.find(e => e.level > currentLevel) ?? null
}
