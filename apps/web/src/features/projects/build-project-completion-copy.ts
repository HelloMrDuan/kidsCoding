export function buildProjectCompletionCopy(lessonId: string) {
  if (lessonId === 'lesson-03-forest-story') {
    return {
      summary:
        '你已经做出了第一个完整小故事。现在可以回到学习地图，继续进入第二单元，把故事从一个画面推进到两个场景。',
      spotlightTag: '第一支完整故事',
      spotlightTitle: '你已经做出了第一个完整小故事',
      spotlightBody:
        '接下来会进入第二单元，孩子会开始学会场景切换和故事顺序，把小故事一步步做得更完整。',
    }
  }

  if (lessonId === 'lesson-06-meadow-story') {
    return {
      summary:
        '你已经做出了第二个完整小故事。现在可以回到学习地图，继续进入第三单元，让故事开始对点击做出反应。',
      spotlightTag: '第二支完整故事',
      spotlightTitle: '你已经做出了第二个完整小故事',
      spotlightBody:
        '接下来会进入第三单元，孩子会开始学会点击触发和简单互动，让故事不只会动，还能回应操作。',
    }
  }

  if (lessonId === 'lesson-12-graduation-show') {
    return {
      summary:
        '你已经完成启蒙毕业作品，可以回看自己的双角色互动故事，再决定是否进入更复杂的高阶创作路线。',
      spotlightTag: '启蒙毕业',
      spotlightTitle: '你的第一部双角色互动故事已经完成',
      spotlightBody:
        '接下来可以先回看毕业作品，再看看高阶创作路线能不能帮助孩子做出更长、更有互动感的故事。',
    }
  }

  return {
    summary: '现在可以回到学习地图，继续挑战下一课。',
    spotlightTag: null,
    spotlightTitle: null,
    spotlightBody: null,
  }
}
