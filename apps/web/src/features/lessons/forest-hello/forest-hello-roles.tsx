import { CharacterArt } from '../playable-stage/character-art'

/** This lesson runs one script for the fox. The rabbit is a fixed stage character. */
export function ForestRolesSlot() {
  return (
    <div data-testid="forest-hello-roles">
      <p className="kc-v3-role-heading">角色与背景 <span>当前编辑：小狐狸</span></p>
      <ul className="kc-v3-role-list">
        <li aria-current="true" data-testid="forest-hello-role-fox">
          <CharacterArt id="fox" />
          <span><strong>小狐狸</strong><small>可编程角色</small></span>
        </li>
        <li data-testid="forest-hello-role-rabbit">
          <CharacterArt id="rabbit" />
          <span><strong>小兔子</strong><small>舞台角色</small></span>
        </li>
      </ul>
      <p className="kc-v3-background">背景：森林</p>
    </div>
  )
}
