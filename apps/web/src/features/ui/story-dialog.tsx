/**
 * UX-003 inline story guide. NOT a modal dialog: the V2 prototype defines
 * no dialog/modal/overlay, so this renders inline inside the lesson task
 * area (per the UX-003 ruling). No <dialog>, no role="dialog", no focus
 * trap, no Esc handling.
 *
 * Visuals reuse the prototype's .pane-h, .task-content, .task-mark,
 * .objective and the stage .speech bubble (as .kc-story-line in flow;
 * see globals.css for the one positioning adaptation). No new palette.
 */
export type StoryDialogueLine = {
  speaker: string
  text: string
}

export type StoryObjective = {
  text: string
  done: boolean
}

export interface StoryDialogProps {
  title: string
  panelLabel?: string
  mark?: string
  stepLabel?: string
  paragraphs: string[]
  dialogue?: StoryDialogueLine[]
  objectives?: StoryObjective[]
}

export function StoryDialog({
  title,
  panelLabel = '故事引导',
  mark = 'STORY / 故事引导',
  stepLabel,
  paragraphs,
  dialogue = [],
  objectives = [],
}: StoryDialogProps) {
  return (
    <section className="kc-lesson-col" data-testid="story-dialog">
      <div className="kc-pane-h">
        <span>{panelLabel}</span>
        {stepLabel ? <span className="kc-chip kc-chip-info">{stepLabel}</span> : null}
      </div>
      <div className="kc-task-content">
        <span className="kc-task-mark">{mark}</span>
        <h3>{title}</h3>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        {dialogue.length > 0 ? (
          <ul className="kc-story-lines">
            {dialogue.map((line, index) => (
              <li key={index} className="kc-story-line">
                <b>{line.speaker}</b> {line.text}
              </li>
            ))}
          </ul>
        ) : null}
        {objectives.length > 0 ? (
          <div className="kc-objective">
            <b>完成目标</b>
            {objectives.map((objective, index) => (
              <div key={index}>
                {objective.done ? '✓' : '○'} {objective.text}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
