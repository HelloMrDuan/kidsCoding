// 演示关用的带种子随机数发生器（mulberry32）及 Scratch `operator_random` 整数规则的 TypeScript 孪生。
//
// 为什么存在：演示关要让每个孩子看到“同样的 10 个位置”，预测才有确定的答案。沙箱（public/scratch-g2-u3-l03-sandbox.html）里
// 有一份同样算法的 JavaScript，只在真实 `operator_random` 被调用的那一瞬间把 Math.random 换成它，调用完立即恢复——
// 随机块本身仍然是真实 VM 的块。本文件的作用是让单元测试能独立算出同一串数，再和真实 VM 在沙箱里实际取出的值逐个对比
// （tests/e2e/g2-u3-l03-vm.spec.ts），两份实现不一致会立刻被发现。

/** mulberry32：返回 [0, 1) 的伪随机数发生器。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Scratch 3 `operator_random`（scratch-vm@5.0.300）对两个整数上下界的取值：
 * 上下界颠倒时小的当下界；相等直接返回；否则 low + floor(r × (high + 1 − low))，两端都包含。
 */
export function scratchRandomInt(from: number, to: number, r: () => number): number {
  const low = from <= to ? from : to
  const high = from <= to ? to : from
  if (low === high) return low
  return low + Math.floor(r() * (high + 1 - low))
}

/** 用同一个种子连续取 n 次（上下界固定），得到演示关会看到的位置序列。 */
export function seededSequence(seed: number, from: number, to: number, n: number): number[] {
  const r = mulberry32(seed)
  return Array.from({ length: n }, () => scratchRandomInt(from, to, r))
}
