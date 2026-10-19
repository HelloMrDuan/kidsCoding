type BlockSnapshot = {
  type: string
}

export function restoreBlockSequence<T extends BlockSnapshot>(
  blocks: T[],
  allowedBlocks: string[],
) {
  const allowed = new Set(allowedBlocks)

  return blocks.filter((block) => allowed.has(block.type))
}
