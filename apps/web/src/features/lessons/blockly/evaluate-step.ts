export function evaluateStep(
  requiredBlockTypes: string[],
  blocks: Array<{ type: string }>,
) {
  if (blocks.length < requiredBlockTypes.length) {
    return false
  }

  return requiredBlockTypes.every((type, index) => blocks[index]?.type === type)
}
