import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('./site/', import.meta.url))
const allowed = new URL(process.env.SCRATCH_PARENT_ORIGIN ?? 'http://127.0.0.1:3110')
if (allowed.href !== allowed.origin + '/' || !['http:', 'https:'].includes(allowed.protocol)) {
  throw new Error('SCRATCH_PARENT_ORIGIN must be an exact web origin')
}
const port = Number(process.env.SCRATCH_PORT ?? '8610')
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.woff2': 'font/woff2',
  '.txt': 'text/plain',
}

createServer((request, response) => {
  response.setHeader('Content-Security-Policy', 'frame-ancestors ' + allowed.origin)
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end()
    return
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (pathname === '/config.js') {
      response.setHeader('Cache-Control', 'no-store')
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
        .end(request.method === 'HEAD' ? undefined : 'window.KC_SCRATCH_PARENT = ' + JSON.stringify(allowed.origin))
      return
    }
    const bundledPath = /^\/(static|chunks)\//.test(pathname) ? '/dist' + pathname : pathname
    const file = resolve(root, '.' + (bundledPath === '/' ? '/host.html' : bundledPath))
    if (!file.startsWith(resolve(root) + sep)) throw new Error('not found')
    const stats = statSync(file)
    if (!stats.isFile()) throw new Error('not found')
    if (bundledPath.startsWith('/dist/')) response.setHeader('Cache-Control', 'public, max-age=3600')
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Length': stats.size })
    if (request.method === 'HEAD') response.end()
    else createReadStream(file).pipe(response)
  } catch {
    if (!response.headersSent) response.writeHead(404).end()
  }
}).listen(port, process.env.SCRATCH_BIND ?? '127.0.0.1', () => console.log('Scratch host listening on ' + port))
