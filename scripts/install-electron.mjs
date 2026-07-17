import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { downloadArtifact } from '@electron/get'
import extract from 'extract-zip'

const require = createRequire(import.meta.url)
const appRoot = path.join(fileURLToPath(new URL('.', import.meta.url)), '..')

function resolveElectronDir() {
  const local = path.resolve(appRoot, 'node_modules', 'electron')
  if (fs.existsSync(path.join(local, 'package.json'))) return local
  try {
    return path.dirname(require.resolve('electron/package.json', { paths: [appRoot] }))
  } catch {
    throw new Error('Cannot find electron package. Run: npm run setup')
  }
}

const electronDir = resolveElectronDir()
const { version } = require(path.join(electronDir, 'package.json'))
const distPath = path.resolve(electronDir, 'dist')
const exeName = process.platform === 'win32' ? 'electron.exe' : 'electron'

async function extractZip(zipPath, destination) {
  if (process.platform === 'win32') {
    fs.rmSync(destination, { recursive: true, force: true })
    fs.mkdirSync(destination, { recursive: true })
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force"`,
      { stdio: 'inherit' }
    )
    return
  }

  fs.mkdirSync(destination, { recursive: true })
  await extract(zipPath, { dir: destination })
}

async function main() {
  if (fs.existsSync(path.join(distPath, exeName))) {
    console.log(`Electron ${version} already installed.`)
    return
  }

  console.log(`Downloading Electron ${version} for ${process.platform}-${process.arch}...`)

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: process.platform,
    arch: process.arch,
    checksums: require(path.join(electronDir, 'checksums.json'))
  })

  console.log('Extracting to', distPath)
  await extractZip(zipPath, distPath)

  if (!fs.existsSync(path.join(distPath, exeName))) {
    throw new Error(`electron binary not found after extraction: ${path.join(distPath, exeName)}`)
  }

  fs.writeFileSync(path.join(electronDir, 'path.txt'), exeName)
  fs.writeFileSync(path.join(distPath, 'version'), version)
  console.log('Electron installed successfully!')
}

main().catch((error) => {
  console.error('Electron install failed:', error)
  process.exit(1)
})
