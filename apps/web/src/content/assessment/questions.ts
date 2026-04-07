import type { AssessmentQuestion } from '@/features/domain/types'

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'sequence',
    prompt: '想让角色连续做几件事，你会怎么安排？',
    options: [
      { id: 'one_by_one', label: '一件一件按顺序排好', score: 1 },
      { id: 'guess_first', label: '先随便点点看', score: 0 },
      { id: 'group_actions', label: '把动作连成一段流程', score: 2 },
    ],
  },
  {
    id: 'loop',
    prompt: '想让角色重复跳舞，你觉得哪种办法更接近？',
    options: [
      { id: 'repeat_until_done', label: '让它重复同一个动作', score: 2 },
      { id: 'click_again', label: '每次都重新点一下', score: 1 },
      { id: 'not_sure', label: '我还不太清楚', score: 0 },
    ],
  },
  {
    id: 'event',
    prompt: '想让角色在被点击时说话，你会怎么做？',
    options: [
      { id: 'click_once', label: '点到它的时候触发一句话', score: 1 },
      { id: 'trigger_by_events', label: '给它一个点击事件', score: 2 },
      { id: 'write_line', label: '直接把话写在页面里', score: 0 },
    ],
  },
  {
    id: 'logic',
    prompt: '如果故事里有两种不同结尾，你觉得应该怎么处理？',
    options: [
      { id: 'branch_story', label: '按不同情况走两条路', score: 2 },
      { id: 'choose_random', label: '随便挑一个继续', score: 0 },
      { id: 'play_twice', label: '放两次不同剧情', score: 1 },
    ],
  },
]
