type BlockSnapshot = {
  type: string
  /** SYS-107: blocks inside a repeat block. */
  body?: BlockSnapshot[]
}

export function restoreBlockSequence<T extends BlockSnapshot>(
  blocks: T[],
  allowedBlocks: string[],
): T[] {
  const allowed = new Set(allowedBlocks)
  const keep = (list: T[]): T[] =>
    list
      .filter((block) => allowed.has(block.type))
      .map((block) => (block.body ? { ...block, body: keep(block.body as T[]) } : block))

  return keep(blocks)
}
