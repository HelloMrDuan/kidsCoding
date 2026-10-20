import { motionWord, quoteBlock, type MotionVerb } from './block-labels'
import { MAX_PROGRAM_BLOCKS, type ObservableVerdict } from './observable-run'

/**
 * TQ-008: turn the real judge result (observable-run.ts) into one short, cute sentence
 * a 5–7 year old can act on. Every message names what to change, never “和要求一样”.
 */
export function explainRunFailure(
  verdict: Pick<ObservableVerdict, 'code' | 'goal' | 'actual'>,
  actor = '小狐狸',
  /** TQ-009: the butterfly flies, so its feedback says “飞” and quotes the “飞” blocks. */
  verb: MotionVerb = 'walk',
): string {
  const { goal, actual } = verdict
  const MOVE = quoteBlock('move_right', verb)
  const REPEAT = quoteBlock('repeat_twice', verb)
  const go = motionWord(verb)
  const hat = goal?.trigger === 'click' ? '被点击时' : '开始时'
  switch (verdict.code) {
    case null:
      return ''
    case 'empty':
      return `舞台上还空空的～先放一块“${hat}”吧！`
    case 'too-many-blocks':
      return `积木太多啦！一次最多 ${MAX_PROGRAM_BLOCKS} 块，拿掉几块再试试。`
    case 'disconnected':
      return `有积木掉队啦！把它们都接在“${hat}”下面，排成一串。`
    case 'missing-start':
      return `${actor}还没听到出发口令哦！把“${hat}”放在最上面。`
    case 'extra-start':
      return '开始积木一块就够啦，把多出来的那块拿走吧。'
    case 'repeat-without-move':
      return `${REPEAT}前面要先有${MOVE}哦。`
    case 'double-scene-switch':
      return '已经在草地啦，不用再切换一次～'
    case 'unsupported-block':
      return '这块积木这节课还用不上，先把它拿走吧。'
    case 'needs-click-trigger':
      return `这次要等你点到${actor}才开始，换成“被点击时”开头吧！`
    case 'needs-start-trigger':
      return '这次一按“运行”就要开始，换成“开始时”开头吧！'
    case 'missing-scene-switch':
      return '还在森林里呢！接上“切换场景”，去草地看看吧。'
    case 'extra-scene-switch':
      return '这一关先留在森林，“切换场景”等一会儿再用～'
    case 'scene-switch-early':
      return `换场景换早啦！先在森林走 ${goal?.sceneSwitchAt ?? 0} 步，再去草地。`
    case 'scene-switch-late':
      return `换场景换晚啦！在森林走 ${goal?.sceneSwitchAt ?? 0} 步就该去草地了。`
    case 'too-few-moves':
      return `${actor}只${go}了 ${actual?.position ?? 0} 步，要${go} ${goal?.position ?? 0} 步哦，再多${go} 100 步吧！`
    case 'too-many-moves':
      return `${actor}${go}过头啦！要${go} ${goal?.position ?? 0} 步，现在${go}了 ${actual?.position ?? 0} 步，少${go} 100 步吧。`
    case 'missing-say':
      return `${actor}还没开口呢！接一块“说一句话”吧。`
    case 'extra-say':
      return '这一关先不用说话，把“说一句话”拿走吧～'
    case 'wrong-line':
      return `${actor}这次要说“${goal?.message ?? ''}”哦。`
    case 'say-too-early':
      return `${actor}说话说早啦！先${go}到位，再开口。`
    case 'say-too-late':
      return `${actor}说话说晚啦！${go}完 ${goal?.messageAt ?? 0} 步就要开口哦。`
    case 'goal-misconfigured':
      return '这一关还没准备好，请爸爸妈妈帮忙看看。'
  }
}
