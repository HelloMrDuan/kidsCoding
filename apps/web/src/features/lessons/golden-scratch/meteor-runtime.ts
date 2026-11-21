import { loadVmEngine } from '@/features/lessons/g2-u3-l02/studio/run-trace'

type Meteor = {
  y: number
  visible: boolean
  getName(): string
  blocks: { getBlock(id: string): { opcode: string } | undefined }
}
type BlockArgs = Record<string, unknown>
type BlockUtility = { target: Meteor; thread: { stack: string[] } }
type Primitive = (args: BlockArgs, utility: BlockUtility) => unknown

type MeteorVm = {
  attachStorage(storage: unknown): void
  loadProject(bytes: ArrayBuffer): Promise<void>
  greenFlag(): void
  stopAll(): void
  quit?(): void
  runtime: {
    _step(): void
    _primitives: Record<string, Primitive>
    currentStepTime: number
    currentMSecs: number
    updateCurrentMSecs(): void
    threads: unknown[]
    targets: Meteor[]
  }
}

type CloneRun = { createdAt: number; startY: number; lowestY: number; removedAtY: number | null; visibleInFlight: boolean }

export type MeteorRun = {
  clones: CloneRun[]
  remaining: number
  originalHidden: boolean
  usedCustomBlock: boolean
  finished: boolean
}

const TICKS_PER_SECOND = 30
const FRAME_MS = 1000 / TICKS_PER_SECOND
const MAX_TICKS = 8 * TICKS_PER_SECOND

function yieldToBrowser() {
  return new Promise<void>(resolve => setTimeout(resolve, 0))
}

export async function observeMeteorShower(
  bytes: ArrayBuffer,
  yieldBetweenBatches = yieldToBrowser,
): Promise<MeteorRun> {
  const { VirtualMachine, ScratchStorage } = await loadVmEngine()
  const vm: MeteorVm = new VirtualMachine()

  try {
    vm.attachStorage(new ScratchStorage())
    await vm.loadProject(bytes.slice(0))
    const meteor = vm.runtime.targets.find(target => target.getName() === '流星')
    if (!meteor) throw new Error('作品中缺少“流星”角色。请保留这个角色后重新检查。')

    const clones = new Map<Meteor, CloneRun>()
    const primitives = vm.runtime._primitives
    let tick = 0
    const time = () => Math.round(tick * FRAME_MS)
    // The real VM's wait blocks use runtime.currentMSecs through BlockUtility.
    // Pin that clock to simulation ticks without changing timers outside this VM.
    vm.runtime.updateCurrentMSecs = () => { vm.runtime.currentMSecs = time() }
    vm.runtime.updateCurrentMSecs()
    const procedureFlights = new Set<Meteor>()

    function observeTargets() {
      for (const target of vm.runtime.targets) {
        if (target === meteor || target.getName() !== '流星') continue
        const known = clones.get(target)
        if (known) {
          known.lowestY = Math.min(known.lowestY, target.y)
          known.visibleInFlight ||= target.visible
        } else {
          clones.set(target, {
            createdAt: time(),
            startY: target.y,
            lowestY: target.y,
            removedAtY: null,
            visibleInFlight: target.visible,
          })
        }
      }
    }

    const create = primitives.control_create_clone_of
    primitives.control_create_clone_of = (args, utility) => {
      const result = create(args, utility)
      observeTargets()
      return result
    }
    const setHeight = primitives.motion_sety
    primitives.motion_sety = (args, utility) => {
      const result = setHeight(args, utility)
      const clone = clones.get(utility.target)
      if (clone) clone.startY = Math.max(clone.startY, utility.target.y)
      return result
    }
    const remove = primitives.control_delete_this_clone
    primitives.control_delete_this_clone = (args, utility) => {
      const clone = clones.get(utility.target)
      const y = utility.target.y
      const result = remove(args, utility)
      if (clone && !vm.runtime.targets.includes(utility.target)) {
        clone.lowestY = Math.min(clone.lowestY, y)
        clone.removedAtY = y
      }
      return result
    }
    for (const opcode of ['motion_changeyby', 'motion_sety', 'motion_gotoxy']) {
      const move = primitives[opcode]
      primitives[opcode] = (args, utility) => {
        const y = utility.target.y
        const inProcedure = utility.thread.stack.some(id => utility.target.blocks.getBlock(id)?.opcode === 'procedures_call')
        const result = move(args, utility)
        if (inProcedure && clones.has(utility.target) && utility.target.y < y) procedureFlights.add(utility.target)
        return result
      }
    }

    vm.runtime.currentStepTime = FRAME_MS
    vm.greenFlag()
    for (tick = 1; tick <= MAX_TICKS && vm.runtime.threads.length && clones.size <= 30; tick++) {
      vm.runtime._step()
      observeTargets()
      if (tick % 12 === 0 && vm.runtime.threads.length) await yieldBetweenBatches()
    }

    return {
      clones: [...clones.values()],
      remaining: vm.runtime.targets.filter(target => clones.has(target)).length,
      originalHidden: !meteor.visible,
      usedCustomBlock: clones.size > 0 && procedureFlights.size === clones.size,
      finished: vm.runtime.threads.length === 0,
    }
  } finally {
    vm.stopAll()
    vm.quit?.()
  }
}

export function hasCompletedFlight(flight: CloneRun) {
  return flight.visibleInFlight && flight.startY >= 100 && flight.lowestY <= -145 &&
    flight.removedAtY !== null && flight.removedAtY <= -145
}

export function hasRegularBursts(clones: CloneRun[]) {
  return clones.length === 10 && clones.slice(1).every((clone, index) => {
    const gap = clone.createdAt - clones[index].createdAt
    // A 300 ms wait plus a small number of real scheduler frames.
    return gap >= 250 && gap <= 400
  })
}
