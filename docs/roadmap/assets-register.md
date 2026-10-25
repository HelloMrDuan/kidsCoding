# 插画资产台账（UX-004）

`apps/web/public/kc-scenes/` 下的四世界插画资产登记。政策与
`apps/web/src/content/curriculum/asset-licenses-v1.json` 一致：每个素材文件都必须
登记来源和授权，只允许 original（本项目原创）或 authorized（有书面授权）。

## 资产表

| 文件 | 主体 | 来源 | 授权 | 大小（字节） |
| --- | --- | --- | --- | --- |
| apps/web/public/kc-scenes/fox.svg | 小狐狸 | 本项目手绘，逐路径提取自 `apps/web/src/features/lessons/playable-stage/character-art.tsx` 的 Fox（V2 冻结风格） | original | 1945 |
| apps/web/public/kc-scenes/bear.svg | 小熊 | 本项目手绘，逐路径提取自 `character-art.tsx` 的 Bear（V2 冻结风格） | original | 1667 |
| apps/web/public/kc-scenes/butterfly.svg | 小蝴蝶 | 本项目手绘，逐路径提取自 `character-art.tsx` 的 Butterfly（V2 冻结风格） | original | 1822 |
| apps/web/public/kc-scenes/forest.svg | 森林 | 本项目手绘，逐路径提取自 `character-art.tsx` 的 SceneBackdrop（forest 配色） | original | 1344 |
| apps/web/public/kc-scenes/meadow.svg | 草地 | 本项目手绘，逐路径提取自 `character-art.tsx` 的 MeadowBackdrop | original | 6651 |
| apps/web/public/kc-scenes/garden.svg | 花园 | 本项目手绘，逐路径提取自 `character-art.tsx` 的 SceneBackdrop（garden 配色 + 花） | original | 3066 |
| apps/web/public/kc-scenes/graduation-island.svg | 毕业岛 | 本项目新绘，与上述资产同一扁平柔和风格；对应课堂 `forest-stage`（毕业舞台）概念，文件名为毕业岛 | original | 3343 |

## 与运行时渲染的关系

课堂舞台当前仍由 `character-art.tsx` 的内联 SVG 渲染（V2 冻结布局与色板不动，
本任务不改任何页面）。上表 6 个提取资产在交付时与内联插画几何完全一致；
`kc-scenes/` 是可独立分发、链接与审计的资产集，`graduation-island.svg` 是新增的
毕业场景。后续页面如需改用文件资产，须另走任务并重做三断点截图验收，不得
在本任务名义下顺带改版式。

## 低带宽降级

- 尺寸预算：单个 SVG 不超过 15000 字节（本批最大 6651 字节）；SVG 为矢量，
  无需多倍图与多尺寸变体，弱网下仍可一次取完。
- 加载失败降级：任一 `kc-scenes` 文件加载失败时，页面保留已有的文字徽标与
  角色名（如 `preview-stage` 的“森林舞台/花园舞台”徽标与“小狐狸/小熊/小蝴蝶”
  名称），不得出现破图占位；降级逻辑沿用现有文本徽标，不新增占位角色
  （负责人永久原则：禁止用纯色圆形/色块加文字代替真实插画，降级只用于
  加载失败的容错，不得作为常态渲染）。
- 一致性校验：`apps/web/src/content/curriculum/kc-scenes-register.test.ts`
  断言台账与文件一一对应、SVG 可解析且含 viewBox、单文件在预算内。
