type BlockSnapshot = {
  type: string
}

export function restoreBlockSequence(
  blocks: BlockSnapshot[],
  allowedBlocks: string[],
) {
  const allowed = new Set(allowedBlocks)

  return blocks.filter((block) => allowed.has(block.type))
}
