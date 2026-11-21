import { loadVmEngine } from '@/features/lessons/g2-u3-l02/studio/run-trace'

type Target = {
  isStage: boolean
  getName(): string
  getCostumes(): { name: string }[]
  currentCostume: number
  sprite: { sounds: { name: string }[] }
}
type BlockUtility = { target: Target }
type Primitive = (args: Record<string, unknown>, utility: BlockUtility) => unknown
type CourseVm = {
  loadProject(bytes: ArrayBuffer): Promise<void>
  attachStorage(storage: unknown): void
  greenFlag(): void
  stopAll(): void
  quit?(): void
  runtime: {
    currentStepTime: number
    targets: Target[]
    threads: unknown[]
    _primitives: Record<string, Primitive>
    _step(): void
    startHats(opcode: string, fields: Record<string, string> | null, target: Target): void
  }
}

export type ConcertObservation = {
  backdrop: string | null
  backdropSwitched: boolean
  bellCount: number
  birdSounds: string[]
  catLine: string | null
  reachedFrameCap: boolean
}

function waitForTick() {
  return new Promise<void>(resolve => setTimeout(resolve, 12))
}

/** Independently checks the actual archive from the GUI on a fresh Scratch VM. */
export async function observeForestConcert(archive: ArrayBuffer): Promise<ConcertObservation> {
  const { VirtualMachine, ScratchStorage } = await loadVmEngine()
  const vm: CourseVm = new VirtualMachine()
  const sounds: Array<{ target: Target; name: string }> = []
  let catLine: string | null = null
  let backdropSwitched = false

  async function finishShortRun() {
    for (let frame = 0; frame < 30 && vm.runtime.threads.length > 0; frame++) {
      vm.runtime._step()
      if (vm.runtime.threads.length > 0) await waitForTick()
    }
    return vm.runtime.threads.length > 0
  }

  try {
    vm.attachStorage(new ScratchStorage())
    await vm.loadProject(archive.slice(0))
    const stage = vm.runtime.targets.find(target => target.isStage)
    const bird = vm.runtime.targets.find(target => target.getName() === '小鸟')
    const cat = vm.runtime.targets.find(target => target.getName() === '小橘猫')
    if (!stage || !bird || !cat) throw new Error('请保留舞台、小鸟和小橘猫，才能检验音乐会。')

    for (const opcode of ['sound_play', 'sound_playuntildone']) {
      const original = vm.runtime._primitives[opcode]
      vm.runtime._primitives[opcode] = (args, utility) => {
        const target = utility.target
        const value = String(args.SOUND_MENU ?? '')
        const found = target.sprite.sounds.find(sound => sound.name === value)
        if (found) sounds.push({ target, name: found.name })
        return original(args, utility)
      }
    }

    for (const opcode of ['looks_say', 'looks_sayforsecs']) {
      const original = vm.runtime._primitives[opcode]
      vm.runtime._primitives[opcode] = (args, utility) => {
        if (utility.target === cat) catLine = String(args.MESSAGE ?? '')
        return original(args, utility)
      }
    }

    for (const opcode of ['looks_switchbackdropto', 'looks_switchbackdroptoandwait', 'looks_nextbackdrop']) {
      const original = vm.runtime._primitives[opcode]
      vm.runtime._primitives[opcode] = (args, utility) => {
        backdropSwitched = true
        return original(args, utility)
      }
    }

    vm.runtime.currentStepTime = 1000 / 30
    vm.greenFlag()
    const reachedFrameCap = await finishShortRun()
    const bellCount = sounds.filter(sound => sound.target === stage && sound.name === '开幕铃').length
    const backdrop = stage.getCostumes()[stage.currentCostume]?.name ?? null
    vm.stopAll()
    sounds.length = 0
    vm.runtime.startHats('event_whenthisspriteclicked', null, bird)
    await finishShortRun()
    const birdSounds = sounds.filter(sound => sound.target === bird).map(sound => sound.name)
    vm.stopAll()
    catLine = null
    vm.runtime.startHats('event_whenthisspriteclicked', null, cat)
    vm.runtime._step()
    return { backdrop, backdropSwitched, bellCount, birdSounds, catLine, reachedFrameCap }
  } finally {
    vm.stopAll()
    vm.quit?.()
  }
}
