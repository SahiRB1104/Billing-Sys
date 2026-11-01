import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const en = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/en.json'), 'utf-8'))
const mr = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/mr.json'), 'utf-8'))

function walk(dir) {
  let files = []
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      files = files.concat(walk(full))
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      files.push(full)
    }
  }
  return files
}

const files = walk(path.join(root, 'src'))
const usedKeys = new Set()
const keyRegex = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8')
  let match
  while ((match = keyRegex.exec(content)) !== null) {
    usedKeys.add(match[1])
  }
}

let hasErrors = false
for (const key of Array.from(usedKeys).sort()) {
  const inEn = key in en
  const inMr = key in mr
  if (!inEn || !inMr) {
    hasErrors = true
    console.error(`Missing i18n key: "${key}" (en: ${inEn ? 'OK' : 'MISSING'}, mr: ${inMr ? 'OK' : 'MISSING'})`)
  }
}

if (hasErrors) {
  console.error('\n❌ check:i18n failed! Add the missing keys to en.json and mr.json.')
  process.exit(1)
} else {
  console.log(`✅ All ${usedKeys.size} i18n keys are properly defined in en.json and mr.json!`)
}
