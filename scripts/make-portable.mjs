/**
 * Creates a portable zip from release/win-unpacked and a desktop shortcut.
 * Does not need NSIS downloads — works offline after `npm run pack`.
 */
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pkg = require(join(root, 'package.json'))

const unpacked = join(root, 'release', 'win-unpacked')
const exe = join(unpacked, 'AmnesiaPanel.exe')
const zipPath = join(root, 'release', `AmnesiaPanel-Portable-${pkg.version}.zip`)

if (!existsSync(exe)) {
  console.error('Not found:', exe)
  console.error('Run `npm run pack` first.')
  process.exit(1)
}

console.log('Creating portable zip...')
const compress = spawnSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${unpacked}\\*' -DestinationPath '${zipPath}' -Force`
  ],
  { stdio: 'inherit' }
)

if (compress.status !== 0) {
  process.exit(compress.status ?? 1)
}

const desktop = join(process.env.USERPROFILE ?? '', 'Desktop', 'AmnesiaPanel.lnk')
console.log('Creating desktop shortcut...')
const shortcut = spawnSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-Command',
    `
      $ws = New-Object -ComObject WScript.Shell
      $sc = $ws.CreateShortcut('${desktop}')
      $sc.TargetPath = '${exe}'
      $sc.WorkingDirectory = '${unpacked}'
      $sc.Description = 'AmnesiaPanel'
      $sc.IconLocation = '${exe},0'
      $sc.Save()
      Write-Host 'Shortcut:' '${desktop}'
    `
  ],
  { stdio: 'inherit' }
)

if (shortcut.status !== 0) {
  console.warn('Shortcut creation failed (zip is still ready).')
}

console.log('Portable ready:', zipPath)
console.log('Golden Key is NOT included — stored only in %AppData% on each PC.')
