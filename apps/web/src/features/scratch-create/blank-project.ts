import JSZip from 'jszip'

const backdrop = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#fff"/></svg>'
const assetId = '1737f3fa2c2a7ef62b382455f3097ee9'

export function createBlankScratchProject() {
  const zip = new JSZip()
  zip.file(assetId + '.svg', backdrop)
  zip.file('project.json', JSON.stringify({
    targets: [{
      isStage: true, name: 'Stage', variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
      currentCostume: 0,
      costumes: [{
        assetId, name: '空白背景', dataFormat: 'svg', md5ext: assetId + '.svg',
        rotationCenterX: 240, rotationCenterY: 180,
      }],
      sounds: [], volume: 100, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'off',
    }],
    monitors: [], extensions: [], meta: { semver: '3.0.0' },
  }))
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
}
