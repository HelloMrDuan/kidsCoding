import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TrialCta } from './trial-cta'

describe('TrialCta', () => {
  it('renders a warm call to start the 12-lesson foundation route', () => {
    render(<TrialCta />)

    expect(screen.getByTestId('trial-cta')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '先把 12 节启蒙主线走完，再决定要不要升级' }),
    ).toBeInTheDocument()
    expect(screen.getByText('第 1 节先让角色走上舞台')).toBeInTheDocument()
    expect(screen.getByText('第 12 节完成启蒙毕业作品')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '立即开始启蒙主线' }),
    ).toHaveAttribute('href', '/onboarding/age')
  })
})
