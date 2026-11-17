/**
 * scratch-vm / scratch-storage 没有随包类型声明；这里只声明
 * run-trace.ts 实际用到的最小面（any 边界只在这两个导入处）。
 */
declare module 'scratch-vm' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const VirtualMachine: any
  export default VirtualMachine
}

declare module 'scratch-storage' {
  export class ScratchStorage {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cache(...args: any[]): void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AssetType: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DataFormat: any
  }
}
