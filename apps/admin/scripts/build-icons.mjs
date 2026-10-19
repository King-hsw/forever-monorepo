/**
 * 构建前生成图标子集:扫描 src 里用到的 `lucide:xxx`,只把用到的图标打进产物。
 * 直接 import 整份 @iconify-json/lucide/icons.json 会让 bundle 多出约 1MB。
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const srcDir = path.join(root, 'src')
const lucidePath = path.join(root, 'node_modules/@iconify-json/lucide/icons.json')
const outPath = path.join(srcDir, 'icons.generated.json')

const lucide = JSON.parse(fs.readFileSync(lucidePath, 'utf8'))

const used = new Set()
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory())
      walk(file)
    else if (/\.(vue|ts)$/.test(entry.name) && entry.name !== 'Icon.vue')
      scan(file)
  }
}

const scan = (file) => {
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(/lucide:([a-z0-9-]+)/g))
    used.add(m[1])
}

walk(srcDir)

const icons = {}
const missing = []
for (const name of [...used].sort()) {
  const icon = lucide.icons[name]
  if (icon) {
    icons[name] = icon
    continue
  }
  const alias = lucide.aliases?.[name]
  if (alias?.parent) {
    icons[name] = lucide.icons[alias.parent]
    continue
  }
  missing.push(name)
}

fs.writeFileSync(outPath, `${JSON.stringify({
  prefix: lucide.prefix,
  width: lucide.width,
  height: lucide.height,
  icons,
}, null, 2)}\n`)

console.log(`[icons] ${Object.keys(icons).length} 个图标 → src/icons.generated.json`)
if (missing.length)
  console.warn(`[icons] 未找到: ${missing.join(', ')}`)
