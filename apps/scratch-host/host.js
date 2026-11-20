/* global GUI, KC_SCRATCH_PARENT */
(() => {
  'use strict'

  const root = document.getElementById('scratch-root')
  const parentOrigin = KC_SCRATCH_PARENT
  if (window.parent === window || !parentOrigin || parentOrigin === location.origin) {
    root.textContent = '请从已配置的 KidsCoding 创作中心打开 Scratch。'
    return
  }

  const editorState = new GUI.EditorState({ locale: 'zh-cn' })
  const phone = matchMedia('(max-width: 450px)')
  if (phone.matches) editorState.dispatch(GUI.setStageSize('small'))
  phone.addEventListener('change', (event) => {
    editorState.dispatch(GUI.setStageSize(event.matches ? 'small' : 'large'))
  })
  GUI.setAppElement(root)
  const editor = GUI.createStandaloneRoot(editorState, root)
  editor.render({ menuBarHidden: true, canSave: false, canShare: false, backpackVisible: false })

  const vm = editorState.store.getState().scratchGui.vm
  const protocol = 'kidscoding-scratch-bridge'
  const max = 5 * 1024 * 1024
  let loading = false
  const reply = (type, requestId, payload, transfer = []) => {
    window.parent.postMessage({ protocol, version: 1, type, requestId, payload }, parentOrigin, transfer)
  }
  vm.on('PROJECT_CHANGED', () => {
    if (!loading) reply('project-changed', 'editor', {})
  })

  window.addEventListener('message', async (event) => {
    if (event.source !== window.parent || event.origin !== parentOrigin) return
    const request = event.data
    if (request?.protocol !== protocol || request.version !== 1 ||
        typeof request.requestId !== 'string' || !request.requestId || request.requestId.length > 128) return
    const { type, requestId, payload } = request
    if (type !== 'get-project' && type !== 'load-project') return
    if (loading || (type === 'get-project' && !vm.runtime.getTargetForStage())) {
      reply('error', requestId, { code: 'busy', detail: 'Scratch 正在载入，请稍候。' })
      return
    }

    try {
      if (type === 'get-project') {
        const projectJson = vm.toJSON()
        const binary = await vm.saveProjectSb3()
        if (binary.size > max || projectJson.length > max) throw new Error('作品超过桥接大小限制。')
        const data = await binary.arrayBuffer()
        reply('project', requestId, { format: 'sb3', projectJson, byteLength: data.byteLength, data }, [data])
        return
      }
      if (payload?.format !== 'sb3' || typeof payload.data !== 'string' || payload.data.length > max) {
        throw new Error('请选择支持大小以内的 Scratch .sb3 文件。')
      }
      const buffer = Uint8Array.from(atob(payload.data), (char) => char.charCodeAt(0)).buffer
      loading = true
      try {
        vm.stopAll()
        await vm.loadProject(buffer)
        const stage = vm.runtime.getTargetForStage()
        if (!stage) throw new Error('文件中没有 Scratch 舞台。')
        reply('loaded', requestId, { targets: vm.runtime.targets.map((target) => target.getName()) })
      } finally {
        loading = false
      }
    } catch (error) {
      reply('error', requestId, { code: 'project', detail: error instanceof Error ? error.message : '处理项目失败' })
    }
  })
})()
