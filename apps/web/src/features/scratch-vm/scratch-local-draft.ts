// This stores genuine Scratch VM .sb3 bytes locally in IndexedDB.
// It never claims a verified learner grade or uploads project content.
export const SCRATCH_DRAFT_LESSON_ID='G3-U1-L02'
const DATABASE='kidscoding-scratch-local-v1'
const STORE='projects'
const LIMIT=5_000_000

export function isScratchArchive(value:unknown):value is ArrayBuffer {
  if(!(value instanceof ArrayBuffer)||value.byteLength<300||value.byteLength>LIMIT)return false
  const header=new Uint8Array(value,0,2)
  return header[0]===0x50&&header[1]===0x4b
}

function database():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(new Error('浏览器不支持 IndexedDB'));return}
    const request=indexedDB.open(DATABASE,1)
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)
    }
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error??new Error('本机数据库打开失败'))
    request.onblocked=()=>reject(new Error('本机数据库被其他页面占用'))
  })
}

export async function readScratchDraft():Promise<ArrayBuffer|null> {
  const db=await database()
  try {
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly')
      const req=tx.objectStore(STORE).get(SCRATCH_DRAFT_LESSON_ID)
      req.onsuccess=()=>{
        const candidate:unknown=req.result?.archive
        resolve(isScratchArchive(candidate)?candidate:null)
      }
      req.onerror=()=>reject(req.error??new Error('草稿读取失败'))
    })
  }finally{db.close()}
}

export async function saveScratchDraft(archive:ArrayBuffer):Promise<void> {
  if(!isScratchArchive(archive))throw new Error('不是有效的 Scratch 项目文件')
  const db=await database()
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite')
      tx.objectStore(STORE).put({archive,savedAt:new Date().toISOString()},SCRATCH_DRAFT_LESSON_ID)
      tx.oncomplete=()=>resolve()
      tx.onerror=()=>reject(tx.error??new Error('本机保存失败'))
      tx.onabort=()=>reject(tx.error??new Error('本机保存已取消'))
    })
  }finally{db.close()}
}

export async function removeScratchDraft():Promise<void> {
  const db=await database()
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite')
      tx.objectStore(STORE).delete(SCRATCH_DRAFT_LESSON_ID)
      tx.oncomplete=()=>resolve()
      tx.onerror=()=>reject(tx.error??new Error('删除本机草稿失败'))
      tx.onabort=()=>reject(tx.error??new Error('删除本机草稿已取消'))
    })
  }finally{db.close()}
}
