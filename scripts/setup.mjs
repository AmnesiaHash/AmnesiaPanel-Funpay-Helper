/**
 * Setup: install deps → pack AmnesiaPanel.exe → Desktop shortcut (no CMD).
 */
import { existsSync, copyFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const unpacked = join(root, 'release', 'win-unpacked')
const exe = join(unpacked, 'AmnesiaPanel.exe')
const desktopLnk = join(process.env.USERPROFILE ?? '', 'Desktop', 'AmnesiaPanel.lnk')

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('=== AmnesiaPanel setup (free desktop app) ===')

const envExample = join(root, '.env.example')
const envFile = join(root, '.env')
if (!existsSync(envFile) && existsSync(envExample)) {
  copyFileSync(envExample, envFile)
  console.log('Created .env from .env.example')
}

run('npm', ['install'])
run('npm', ['run', 'pack'])

if (!existsSync(exe)) {
  console.error('Exe missing after pack:', exe)
  process.exit(1)
}

writeFileSync(join(unpacked, '.env'), 'FUNPAY_BASE_URL=https://funpay.com\n', 'utf8')

const ps = `
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut('${desktopLnk.replace(/'/g, "''")}')
$sc.TargetPath = '${exe.replace(/'/g, "''")}'
$sc.WorkingDirectory = '${unpacked.replace(/'/g, "''")}'
$sc.Description = 'AmnesiaPanel'
$sc.IconLocation = '${exe.replace(/'/g, "''")},0'
$sc.Save()
Write-Host 'Shortcut:' '${desktopLnk.replace(/'/g, "''")}'
`
const shortcut = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { stdio: 'inherit' })
if (shortcut.status !== 0) process.exit(shortcut.status ?? 1)

console.log(`
Done.
Desktop: AmnesiaPanel.lnk → AmnesiaPanel.exe (no CMD, no subscription)
`)
