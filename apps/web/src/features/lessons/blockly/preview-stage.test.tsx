import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PreviewStage } from './preview-stage'

describe('PreviewStage', () => {
  it('renders the stage shell and scene-change guidance', () => {
    render(
      <PreviewStage
        blocks={[
          { type: 'when_start' },
          { type: 'move_right' },
          { type: 'switch_scene' },
        ]}
      />,
    )

    expect(screen.getByTestId('lesson-preview-stage')).toBeInTheDocument()
    expect(screen.getByText('作品舞台')).toBeInTheDocument()
    expect(
      screen.getByText(
        '太好了，故事已经从森林走到草地了。再接一句收尾的话，小旅行就更完整了。',
      ),
    ).toBeInTheDocument()
  })

  it('describes the click trigger once when when_clicked has been connected', () => {
    render(<PreviewStage blocks={[{ type: 'when_clicked' }]} />)

    expect(
      screen.getByText(
        '很好，角色已经准备好回应你的点击了。再接一个动作积木，点一下就能看到变化。',
      ),
    ).toBeInTheDocument()
  })

  it('describes the interactive response when click, motion, and dialogue are connected', () => {
    render(
      <PreviewStage
        blocks={[
          { type: 'when_clicked' },
          { type: 'move_right' },
          { type: 'say_line' },
        ]}
      />,
    )

    expect(
      screen.getByText(
        '太好了，角色已经会在点击后先动起来，再用一句话回应你。',
      ),
    ).toBeInTheDocument()
  })

  it('describes the second friend getting ready when a second start block is added', () => {
    render(<PreviewStage blocks={[{ type: 'when_start' }, { type: 'when_start' }]} />)

    expect(
      screen.getByText(
        '太好了，第二位朋友也准备好上场了。再接一个动作积木，舞台就会更热闹。',
      ),
    ).toBeInTheDocument()
  })
})
