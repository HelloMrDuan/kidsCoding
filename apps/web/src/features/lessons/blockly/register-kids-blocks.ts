import * as Blockly from 'blockly'

import { getKidsBlockLabel, kidsBlockLabels } from './block-labels'
import { REPEAT_TIMES_OPTIONS } from './program-tree'

export { getKidsBlockLabel, kidsBlockLabels }

/**
 * TQ-009: move/repeat blocks carry their text in a named, serializable label field so the
 * workspace can show “向右飞 100 步” for the butterfly while the block type stays move_right.
 */
export const BLOCK_LABEL_FIELD = 'LABEL'

const ICONS: Record<string, string> = {
  flag: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M6%203v18%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.6%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M7%204h11l-3%204%203%204H7z%22%20fill%3D%22%234cd964%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.6%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E',
  hand: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M9%2012V5a1.6%201.6%200%200%201%203.2%200v5.5V4a1.6%201.6%200%200%201%203.2%200v7V6a1.6%201.6%200%200%201%203.2%200v8c0%204-2.6%207-6.6%207-2.6%200-4.2-1.3-5.6-3.4L4%2014.2a1.5%201.5%200%200%201%202.4-1.8z%22%20fill%3D%22%23fff%22/%3E%3C/svg%3E',
  arrow: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M3%209.5h10V5l8%207-8%207v-4.5H3z%22%20fill%3D%22%23fff%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E',
  bubble: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M4%205h16a1%201%200%200%201%201%201v9a1%201%200%200%201-1%201h-9l-5%204v-4H4a1%201%200%200%201-1-1V6a1%201%200%200%201%201-1z%22%20fill%3D%22%23fff%22/%3E%3Ccircle%20cx%3D%228.5%22%20cy%3D%2210.5%22%20r%3D%221.4%22%20fill%3D%22%233fbf6a%22/%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2210.5%22%20r%3D%221.4%22%20fill%3D%22%233fbf6a%22/%3E%3Ccircle%20cx%3D%2215.5%22%20cy%3D%2210.5%22%20r%3D%221.4%22%20fill%3D%22%233fbf6a%22/%3E%3C/svg%3E',
  picture: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Crect%20x%3D%223%22%20y%3D%225%22%20width%3D%2218%22%20height%3D%2214%22%20rx%3D%222.5%22%20fill%3D%22%23fff%22/%3E%3Cpath%20d%3D%22M5%2017l5-6%204%204%202-2%203%204z%22%20fill%3D%22%238a63df%22/%3E%3Ccircle%20cx%3D%2216.5%22%20cy%3D%229%22%20r%3D%221.8%22%20fill%3D%22%23ffc94a%22/%3E%3C/svg%3E',
  swap: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M5%208h12l-3-3M19%2016H7l3%203%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.6%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E',
  repeat: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M5%2012a7%207%200%200%201%2012-5l2%202M19%2012a7%207%200%200%201-12%205l-2-2%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.6%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M19%204v5h-5M5%2020v-5h5%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.6%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E',
  arrowUp: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cg%20transform%3D%22rotate%28-90%2012%2012%29%22%3E%3Cpath%20d%3D%22M3%209.5h10V5l8%207-8%207v-4.5H3z%22%20fill%3D%22%23fff%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  arrowDown: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cg%20transform%3D%22rotate%2890%2012%2012%29%22%3E%3Cpath%20d%3D%22M3%209.5h10V5l8%207-8%207v-4.5H3z%22%20fill%3D%22%23fff%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  arrowLeft: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cg%20transform%3D%22rotate%28180%2012%2012%29%22%3E%3Cpath%20d%3D%22M3%209.5h10V5l8%207-8%207v-4.5H3z%22%20fill%3D%22%23fff%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
  forward: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M5%2020V9a3%203%200%200%201%203-3h7V2l6%206-6%206v-4H9v10z%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',
  turnLeft: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M19%2020v-7a5%205%200%200%200-5-5H8%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.8%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M10%203%204%208l6%205z%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',
  turnRight: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M5%2020v-7a5%205%200%200%201%205-5h6%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.8%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M14%203l6%205-6%205z%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',
  key: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Ccircle%20cx%3D%228%22%20cy%3D%2212%22%20r%3D%224.6%22%20fill%3D%22none%22%20stroke%3D%22%23ffe066%22%20stroke-width%3D%222.8%22%2F%3E%3Cpath%20d%3D%22M12.4%2012H21M18%2012v3.5M15.4%2012v2.6%22%20stroke%3D%22%23ffe066%22%20stroke-width%3D%222.8%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E',
  sun: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%224.6%22%20fill%3D%22%23fff%22%2F%3E%3Cpath%20d%3D%22M12%202.5v3M12%2018.5v3M2.5%2012h3M18.5%2012h3M5.3%205.3l2.1%202.1M16.6%2016.6l2.1%202.1M5.3%2018.7l2.1-2.1M16.6%207.4l2.1-2.1%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E',
  bell: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M6%2017V11a6%206%200%200%201%2012%200v6l2%202H4z%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2220.5%22%20r%3D%222%22%20fill%3D%22%23fff%22%2F%3E%3Cpath%20d%3D%22M12%203v2%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E',
  star: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M12%203l2.6%205.6%206%20.7-4.5%204.1%201.2%206L12%2016.4%206.7%2019.4l1.2-6L3.4%209.3l6-.7z%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',
  door: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M5%2021V10a7%207%200%200%201%2014%200v11z%22%20fill%3D%22%23fff%22%2F%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2215%22%20r%3D%221.6%22%20fill%3D%22%23b06a2b%22%2F%3E%3C%2Fsvg%3E',
  water: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M4%209%20h11%20v9%20a2%202%200%200%201-2%202%20H6%20a2%202%200%200%201-2-2%20z%22%20fill%3D%22%23fff%22%2F%3E%3Cpath%20d%3D%22M15%2011%20l5-4%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.4%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M6%209%20a4%204%200%200%201%207%200%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M21%2012%20q1.5%202.5%200%203.5%20q-1.5-1%200-3.5%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',
  jump: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M3%2018%20Q12%201%2021%2018%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.6%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M17%2015%20l4%203%201-5%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.6%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Ccircle%20cx%3D%223%22%20cy%3D%2219%22%20r%3D%221.8%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',
  pawRed: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cellipse%20cx%3D%2212%22%20cy%3D%2215.5%22%20rx%3D%225%22%20ry%3D%224.2%22%20fill%3D%22%23e5484d%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.6%22%2F%3E%3Ccircle%20cx%3D%226%22%20cy%3D%229%22%20r%3D%222.2%22%20fill%3D%22%23e5484d%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%2F%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%225.6%22%20r%3D%222.2%22%20fill%3D%22%23e5484d%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%2F%3E%3Ccircle%20cx%3D%2214%22%20cy%3D%225.6%22%20r%3D%222.2%22%20fill%3D%22%23e5484d%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%229%22%20r%3D%222.2%22%20fill%3D%22%23e5484d%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%2F%3E%3C%2Fsvg%3E',
  pawBlue: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cellipse%20cx%3D%2212%22%20cy%3D%2215.5%22%20rx%3D%225%22%20ry%3D%224.2%22%20fill%3D%22%233e7bfa%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.6%22%2F%3E%3Ccircle%20cx%3D%226%22%20cy%3D%229%22%20r%3D%222.2%22%20fill%3D%22%233e7bfa%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%2F%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%225.6%22%20r%3D%222.2%22%20fill%3D%22%233e7bfa%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%2F%3E%3Ccircle%20cx%3D%2214%22%20cy%3D%225.6%22%20r%3D%222.2%22%20fill%3D%22%233e7bfa%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%229%22%20r%3D%222.2%22%20fill%3D%22%233e7bfa%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.4%22%2F%3E%3C%2Fsvg%3E',
}

/**
 * Cartoon, child-friendly block theme: Scratch-like chunky "zelos" shapes,
 * one bright colour per category and a small white icon on every block.
 * Colours follow the V2 prototype block palette (event amber, motion blue,
 * looks purple, control orange) plus teal/pink for scene/friend switching.
 */
let cartoonTheme: Blockly.Theme | null = null

export function getKidsBlockTheme() {
  cartoonTheme ??= Blockly.Theme.defineTheme('kidscoding-cartoon', {
  name: 'kidscoding-cartoon',
  base: Blockly.Themes.Classic,
  blockStyles: {
    kc_event: { colourPrimary: '#ffab19', colourSecondary: '#ffc861', colourTertiary: '#cf8b17', hat: 'cap' },
    kc_event_click: { colourPrimary: '#ff8c1a', colourSecondary: '#ffb366', colourTertiary: '#d9700f', hat: 'cap' },
    kc_motion: { colourPrimary: '#4c97ff', colourSecondary: '#7db5ff', colourTertiary: '#3373cc' },
    kc_looks: { colourPrimary: '#3fbf6a', colourSecondary: '#74d494', colourTertiary: '#2b9a51' },
    kc_scene: { colourPrimary: '#9966ff', colourSecondary: '#b994ff', colourTertiary: '#774dcb' },
    kc_friend: { colourPrimary: '#ff6680', colourSecondary: '#ff94a6', colourTertiary: '#d94a63' },
    kc_item: { colourPrimary: '#cf63cf', colourSecondary: '#e08fe0', colourTertiary: '#a63fa6' },
    kc_control: { colourPrimary: '#0fbdbd', colourSecondary: '#5cd6d6', colourTertiary: '#0b9696' },
  },
  componentStyles: {
    workspaceBackgroundColour: '#ffffff',
    flyoutBackgroundColour: '#f4f8ff',
    flyoutOpacity: 1,
    scrollbarColour: '#c9d6ea',
    scrollbarOpacity: 0.8,
  },
  fontStyle: { family: '"PingFang SC","Microsoft YaHei",sans-serif', weight: '700', size: 13 },
  })
  return cartoonTheme
}

let isRegistered = false

const KIDS_BLOCK_DEFINITIONS = [
    {
      type: 'when_start',
      message0: '%1 ' + kidsBlockLabels.when_start,
      args0: [{ type: 'field_image', src: ICONS.flag, width: 22, height: 22, alt: '' }],
      nextStatement: null,
      style: 'kc_event',
    },
    {
      type: 'when_clicked',
      message0: '%1 ' + kidsBlockLabels.when_clicked,
      args0: [{ type: 'field_image', src: ICONS.hand, width: 22, height: 22, alt: '' }],
      nextStatement: null,
      style: 'kc_event_click',
    },
    {
      type: 'move_right',
      message0: '%1 %2',
      args0: [
        { type: 'field_image', src: ICONS.arrow, width: 22, height: 22, alt: '' },
        { type: 'field_label_serializable', name: BLOCK_LABEL_FIELD, text: kidsBlockLabels.move_right },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      type: 'say_line',
      message0: '%1 ' + kidsBlockLabels.say_line,
      args0: [{ type: 'field_image', src: ICONS.bubble, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_looks',
    },
    {
      type: 'switch_scene',
      message0: '%1 ' + kidsBlockLabels.switch_scene,
      args0: [{ type: 'field_image', src: ICONS.picture, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_scene',
    },
    {
      type: 'switch_character',
      message0: '%1 ' + kidsBlockLabels.switch_character,
      args0: [{ type: 'field_image', src: ICONS.swap, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_friend',
    },
    {
      type: 'repeat_twice',
      message0: '%1 %2',
      args0: [
        { type: 'field_image', src: ICONS.repeat, width: 22, height: 22, alt: '' },
        { type: 'field_label_serializable', name: BLOCK_LABEL_FIELD, text: kidsBlockLabels.repeat_twice },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_control',
    },
    {
      // SYS-107: a real loop — the blocks inside its mouth run N times.
      type: 'repeat_times',
      message0: '%1 %2 %3 次',
      args0: [
        { type: 'field_image', src: ICONS.repeat, width: 22, height: 22, alt: '' },
        { type: 'field_label_serializable', name: BLOCK_LABEL_FIELD, text: kidsBlockLabels.repeat_times },
        { type: 'field_dropdown', name: 'TIMES', options: REPEAT_TIMES_OPTIONS.map(n => [String(n), String(n)]) },
      ],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_control',
    },
  // SYS-106 grid path-finding blocks (G0 direction / path_obstacles)
    {
      type: 'move_up',
      message0: '%1 ' + kidsBlockLabels.move_up,
      args0: [{ type: 'field_image', src: ICONS.arrowUp, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      type: 'move_down',
      message0: '%1 ' + kidsBlockLabels.move_down,
      args0: [{ type: 'field_image', src: ICONS.arrowDown, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      type: 'move_left',
      message0: '%1 ' + kidsBlockLabels.move_left,
      args0: [{ type: 'field_image', src: ICONS.arrowLeft, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      type: 'move_right_cell',
      message0: '%1 ' + kidsBlockLabels.move_right_cell,
      args0: [{ type: 'field_image', src: ICONS.arrow, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      type: 'move_forward',
      message0: '%1 ' + kidsBlockLabels.move_forward,
      args0: [{ type: 'field_image', src: ICONS.forward, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      type: 'turn_left',
      message0: '%1 ' + kidsBlockLabels.turn_left,
      args0: [{ type: 'field_image', src: ICONS.turnLeft, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      type: 'turn_right',
      message0: '%1 ' + kidsBlockLabels.turn_right,
      args0: [{ type: 'field_image', src: ICONS.turnRight, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      // G0-U3-L03: water the flower pot on the current cell.
      type: 'water_plant',
      message0: '%1 ' + kidsBlockLabels.water_plant,
      args0: [{ type: 'field_image', src: ICONS.water, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_looks',
    },
    {
      // G0-U3-L02: hop two cells forward, over a puddle.
      type: 'jump_forward',
      message0: '%1 ' + kidsBlockLabels.jump_forward,
      args0: [{ type: 'field_image', src: ICONS.jump, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_motion',
    },
    {
      // G0-U3: leave a red / blue footprint on the fox's cell.
      type: 'stamp_red',
      message0: '%1 ' + kidsBlockLabels.stamp_red,
      args0: [{ type: 'field_image', src: ICONS.pawRed, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_item',
    },
    {
      type: 'stamp_blue',
      message0: '%1 ' + kidsBlockLabels.stamp_blue,
      args0: [{ type: 'field_image', src: ICONS.pawBlue, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_item',
    },
    {
      type: 'pick_key',
      message0: '%1 ' + kidsBlockLabels.pick_key,
      args0: [{ type: 'field_image', src: ICONS.key, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_item',
    },
    {
      type: 'open_door',
      message0: '%1 ' + kidsBlockLabels.open_door,
      args0: [{ type: 'field_image', src: ICONS.door, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_item',
    },
    // G0-U2 (Hark A): event-stage blocks — the bell message and per-character actions.
    {
      type: 'when_bell',
      message0: '%1 ' + kidsBlockLabels.when_bell,
      args0: [{ type: 'field_image', src: ICONS.bell, width: 22, height: 22, alt: '' }],
      nextStatement: null,
      style: 'kc_event',
    },
    {
      type: 'wake_up',
      message0: '%1 ' + kidsBlockLabels.wake_up,
      args0: [{ type: 'field_image', src: ICONS.sun, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_looks',
    },
    {
      type: 'say_hello',
      message0: '%1 ' + kidsBlockLabels.say_hello,
      args0: [{ type: 'field_image', src: ICONS.bubble, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_looks',
    },
    {
      type: 'show_surprise',
      message0: '%1 ' + kidsBlockLabels.show_surprise,
      args0: [{ type: 'field_image', src: ICONS.star, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_looks',
    },
    {
      type: 'enter_stage',
      message0: '%1 ' + kidsBlockLabels.enter_stage,
      args0: [{ type: 'field_image', src: ICONS.swap, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_friend',
    },
    {
      type: 'raise_flag',
      message0: '%1 ' + kidsBlockLabels.raise_flag,
      args0: [{ type: 'field_image', src: ICONS.flag, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_item',
    },
    {
      type: 'fall_down',
      message0: '%1 ' + kidsBlockLabels.fall_down,
      args0: [{ type: 'field_image', src: ICONS.arrowDown, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_item',
    },
    {
      type: 'send_bell',
      message0: '%1 ' + kidsBlockLabels.send_bell,
      args0: [{ type: 'field_image', src: ICONS.bell, width: 22, height: 22, alt: '' }],
      previousStatement: null,
      nextStatement: null,
      style: 'kc_control',
    },
]

export function registerKidsBlocks() {
  if (isRegistered) {
    return
  }

  Blockly.defineBlocksWithJsonArray(KIDS_BLOCK_DEFINITIONS)

  isRegistered = true
}

/**
 * UX-203: toolbox categories group the kids blocks by their theme style, so
 * the workspace toolbox shows one coloured category per family instead of a
 * flat flyout. The style map is derived from the block definitions above,
 * never hand-copied, so a new block lands in its category automatically.
 */
const KIDS_BLOCK_STYLE_BY_TYPE: Record<string, string> = Object.fromEntries(
  KIDS_BLOCK_DEFINITIONS.map((definition) => [definition.type, definition.style]),
)

export type KidsToolboxCategory = { name: string; colour: string; types: string[] }

const KIDS_TOOLBOX_CATEGORIES: Array<{ name: string; colour: string; styles: string[] }> = [
  { name: '开始', colour: '#ffab19', styles: ['kc_event', 'kc_event_click'] },
  { name: '移动', colour: '#4c97ff', styles: ['kc_motion'] },
  { name: '说话', colour: '#3fbf6a', styles: ['kc_looks'] },
  { name: '场景', colour: '#9966ff', styles: ['kc_scene'] },
  { name: '朋友', colour: '#ff6680', styles: ['kc_friend'] },
  { name: '物品', colour: '#cf63cf', styles: ['kc_item'] },
  { name: '控制', colour: '#0fbdbd', styles: ['kc_control'] },
]

export function buildKidsToolboxCategories(allowedBlocks: string[]): KidsToolboxCategory[] {
  const grouped = KIDS_TOOLBOX_CATEGORIES.map((category) => ({
    name: category.name,
    colour: category.colour,
    types: allowedBlocks.filter((type) => category.styles.includes(KIDS_BLOCK_STYLE_BY_TYPE[type] ?? '')),
  })).filter((category) => category.types.length > 0)
  // A lesson allowing a block this file does not define yet keeps it usable
  // (and visible) instead of silently dropping it from the toolbox.
  const unknown = allowedBlocks.filter((type) => !(type in KIDS_BLOCK_STYLE_BY_TYPE))
  if (unknown.length > 0) {
    grouped.push({ name: '更多', colour: '#6f7d92', types: unknown })
  }
  return grouped
}

