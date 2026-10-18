/**
 * SYS-101 (02-PHASED-DELIVERY P1.1): how the 12 independent launch lessons relate to the
 * 432-lesson catalog (G0 / G1). The launch lessons keep their own IDs, URLs and saved progress;
 * they are NOT added to the 432 total and they never auto-complete a catalog lesson.
 *
 * relation:
 *  - 'replaces': the launch lesson fully covers the catalog lesson's objective (catalog lesson may be skipped).
 *  - 'bridges':  same concept at an easier entry level; the catalog lesson still has to be taught.
 *  - 'distinct': no teaching overlap with any catalog lesson.
 *
 * Current review result: no launch lesson replaces a catalog lesson. The launch engine runs one
 * fixed scene per lesson, while the matching catalog lessons ask for richer behaviour (multiple
 * events, messages, obstacles, open design), so every link below is 'bridges'.
 */
export type LaunchCatalogRelation = 'replaces' | 'bridges' | 'distinct'

export type LaunchCatalogLink = {
  launchLessonId: string
  relation: LaunchCatalogRelation
  catalogLessonIds: string[]
  sharedConcepts: string[]
  rationale: string
}

export const launchCatalogMapping: LaunchCatalogLink[] = [
  {
    launchLessonId: 'lesson-01-forest-hello',
    relation: 'bridges',
    catalogLessonIds: ['G0-U1-L03'],
    sharedConcepts: ['顺序', '移动'],
    rationale: '启蒙课只让小狐狸走到舞台另一边；G0「向右走三步」要求精确步数和多一步/少一步的调试。',
  },
  {
    launchLessonId: 'lesson-02-forest-greeting',
    relation: 'bridges',
    catalogLessonIds: ['G0-U1-L01', 'G1-U1-L01'],
    sharedConcepts: ['开始事件', '动作顺序', '对白'],
    rationale: '启蒙课是“出场后说一句话”；G0-U1-L01 引入启动指令牌，G1-U1-L01 扩展为完整开场。',
  },
  {
    launchLessonId: 'lesson-03-forest-story',
    relation: 'bridges',
    catalogLessonIds: ['G1-U1-L01'],
    sharedConcepts: ['动作+对白', '小故事'],
    rationale: '把动作和对白连成第一个小故事，是 G1 故事开场的低龄入口。',
  },
  {
    launchLessonId: 'lesson-04-meadow-scene',
    relation: 'bridges',
    catalogLessonIds: ['G1-U1-L03'],
    sharedConcepts: ['场景切换'],
    rationale: '启蒙课固定森林→草地一次转场；G1「设置故事背景」要求自己选择和设置背景。',
  },
  {
    launchLessonId: 'lesson-05-meadow-order',
    relation: 'bridges',
    catalogLessonIds: ['G0-U1-L05'],
    sharedConcepts: ['顺序', '前后依赖'],
    rationale: '先出发再到达的顺序意识，是 G0「先开门再前进」前置条件的铺垫。',
  },
  {
    launchLessonId: 'lesson-06-meadow-story',
    relation: 'bridges',
    catalogLessonIds: ['G1-U1-L06'],
    sharedConcepts: ['动作', '转场', '对白', '作品'],
    rationale: '启蒙第二个完整故事；G1-U1-L06 是自编完整童话的单元作品。',
  },
  {
    launchLessonId: 'lesson-07-garden-click',
    relation: 'bridges',
    catalogLessonIds: ['G0-U2-L05'],
    sharedConcepts: ['点击事件'],
    rationale: '点击角色触发反应；G0「点击苹果让它落下」还要求区分点击对象。',
  },
  {
    launchLessonId: 'lesson-08-garden-dialogue',
    relation: 'bridges',
    catalogLessonIds: ['G0-U2-L05', 'G0-U2-L03'],
    sharedConcepts: ['点击事件', '角色响应'],
    rationale: '点击后先动再说；G0-U2-L03 进一步用消息触发另一个角色响应。',
  },
  {
    launchLessonId: 'lesson-09-garden-story',
    relation: 'bridges',
    catalogLessonIds: ['G0-U2-L06'],
    sharedConcepts: ['事件', '互动作品'],
    rationale: '单角色互动表演；G0「森林伙伴见面会」是多角色、观众参与的单元作品。',
  },
  {
    launchLessonId: 'lesson-10-second-friend',
    relation: 'bridges',
    catalogLessonIds: ['G0-U2-L04'],
    sharedConcepts: ['多角色', '角色切换'],
    rationale: '启蒙课切换到第二个角色独立行动；G0「切换两位朋友」还要求两个角色分别响应不同事件。',
  },
  {
    launchLessonId: 'lesson-11-duo-rehearsal',
    relation: 'bridges',
    catalogLessonIds: ['G0-U2-L04', 'G1-U1-L02'],
    sharedConcepts: ['多角色', '对白'],
    rationale: '两个角色依次行动并由第二角色说话，衔接 G0 角色切换与 G1「与兔子轮流说话」。',
  },
  {
    launchLessonId: 'lesson-12-graduation-show',
    relation: 'bridges',
    catalogLessonIds: ['G0-U2-L06'],
    sharedConcepts: ['多角色', '目标判定', '作品'],
    rationale: '启蒙毕业作品（两个目标都到位才找到礼物）；G0-U2-L06 要求更开放的多角色编排。',
  },
]

export function getLaunchCatalogLink(launchLessonId: string) {
  return launchCatalogMapping.find((entry) => entry.launchLessonId === launchLessonId) ?? null
}

/** Launch lessons that prepare for a catalog lesson (used by catalog detail / maturity views). */
export function getLaunchLessonsForCatalogLesson(catalogLessonId: string) {
  return launchCatalogMapping.filter((entry) => entry.catalogLessonIds.includes(catalogLessonId))
}

/** Launch progress never completes catalog lessons unless a reviewed 'replaces' link says so. */
export function catalogLessonsCompletedByLaunch(completedLaunchLessonIds: string[]) {
  return launchCatalogMapping
    .filter((entry) => entry.relation === 'replaces' && completedLaunchLessonIds.includes(entry.launchLessonId))
    .flatMap((entry) => entry.catalogLessonIds)
}
