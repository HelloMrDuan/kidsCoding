import JSZip from 'jszip'

// The GUI can export an unchanged project in a new ZIP container with different
// timestamps. Compare validated entry contents, including the assets.
export async function sameScratchContents(previous: ArrayBuffer, current: ArrayBuffer) {
  const [left, right] = await Promise.all([JSZip.loadAsync(previous), JSZip.loadAsync(current)])
  const files = Object.values(left.files).filter(file => !file.dir)
  if (files.length !== Object.values(right.files).filter(file => !file.dir).length) return false
  for (const file of files) {
    const other = right.file(file.name)
    if (!other) return false
    const [first, second] = await Promise.all([file.async('uint8array'), other.async('uint8array')])
    if (first.length !== second.length || !first.every((byte, index) => second[index] === byte)) return false
  }
  return true
}
