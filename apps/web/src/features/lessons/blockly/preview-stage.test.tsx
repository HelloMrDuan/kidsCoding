import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PreviewStage } from './preview-stage'

describe('PreviewStage', () => {
  it('describes the scene change when switch_scene has been connected', () => {
    render(
      <PreviewStage
        blocks={[
          { type: 'when_start' },
          { type: 'move_right' },
          { type: 'switch_scene' },
        ]}
      />,
    )

    expect(
      screen.getByText('太好了，故事已经从森林走到草地了。再接一句收尾的话，旅行就更完整了。'),
    ).toBeInTheDocument()
  })
})
