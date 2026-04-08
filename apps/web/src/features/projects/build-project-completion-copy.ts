type ProjectCompletionCopy = {
  summary: string
  spotlightTag: string | null
  spotlightTitle: string | null
  spotlightBody: string | null
}

const PROJECT_COMPLETION_COPY: Record<string, ProjectCompletionCopy> = {
  'lesson-03-forest-story': {
    summary:
      '小狐狸已经会走上舞台，还会打招呼了。先回看作品，再进入下一单元。',
    spotlightTag: '第一个完整作品',
    spotlightTitle: '你做出了一个完整作品',
    spotlightBody:
      '这次，小狐狸走上舞台，还会打招呼了。现在可以继续第二单元，让故事从一个画面走到另一个画面。',
  },
  'lesson-06-meadow-story': {
    summary:
      '这次，小动物从森林走到草地，完成了一次小旅行。先回看作品，再进入下一单元。',
    spotlightTag: '第二个完整作品',
    spotlightTitle: '你做出了一个完整作品',
    spotlightBody:
      '这次，小动物从森林走到草地，完成了一次小旅行。现在可以继续第三单元，让故事开始回应点击。',
  },
  'lesson-09-garden-story': {
    summary:
      '现在，你的故事已经会回应你的点击了。先回看作品，再进入下一单元。',
    spotlightTag: '第三个完整作品',
    spotlightTitle: '你做出了一个完整作品',
    spotlightBody:
      '这次，你做出了会回应点击的互动故事。现在可以继续第四单元，让两个角色一起完成启蒙毕业作品。',
  },
  'lesson-12-graduation-show': {
    summary:
      '这次，两个动物朋友一起完成了一个完整故事。先回看作品，再看看高阶创作阶段。',
    spotlightTag: '启蒙毕业作品',
    spotlightTitle: '你做出了一个完整作品',
    spotlightBody:
      '这次，两个动物朋友一起完成了一个完整故事。你已经完成启蒙毕业作品，可以先回看作品，再看看高阶创作阶段。',
  },
}

const DEFAULT_COMPLETION_COPY: ProjectCompletionCopy = {
  summary: '先回看你的作品，再继续下一课。',
  spotlightTag: null,
  spotlightTitle: null,
  spotlightBody: null,
}

export function buildProjectCompletionCopy(lessonId: string) {
  return PROJECT_COMPLETION_COPY[lessonId] ?? DEFAULT_COMPLETION_COPY
}
