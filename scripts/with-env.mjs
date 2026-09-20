// Runs a command with ONE environment file loaded: .env.dev (local database) or .env.prod (production).
//
//   node scripts/with-env.mjs <dev|prod> [--guard] -- <command> [args...]
//
// Normally used through the npm scripts (npm run dev, dev:prod, db:push, db:push:prod, ...).
// The variables are set on the command itself, so they win over anything in the shell and over .env
// loading by Vite, dotenv and Prisma. --guard asks for confirmation before running against production.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { spawn } from 'node:child_process'
import dotenv from 'dotenv'
import { describeTarget, envFileFor, validateEnvironment } from './env-launcher.mjs'

const [name, ...rest] = process.argv.slice(2)
const separator = rest.indexOf('--')
const flags = separator === -1 ? rest : rest.slice(0, separator)
const command = separator === -1 ? [] : rest.slice(separator + 1)
const guard = flags.includes('--guard')

const fail = (message) => {
  console.error(`\n${message}\n`)
  process.exit(1)
}

if (!name || command.length === 0) {
  fail('Bruk: node scripts/with-env.mjs <dev|prod> [--guard] -- <kommando> [argumenter]')
}

const file = path.resolve(process.cwd(), envFileFor(name))
if (!fs.existsSync(file)) {
  fail(`Fant ikke ${envFileFor(name)}. Se README (avsnittet «Local database and environments») for hvordan filen lages.`)
}

const vars = dotenv.parse(fs.readFileSync(file))
const check = validateEnvironment(name, vars)
if (!check.ok) fail(check.errors.join('\n'))

console.log(`\n${describeTarget(name, check)}\n`)

async function confirmProduction() {
  if (process.env.CONFIRM_PRODUCTION === '1') return true

  if (!process.stdin.isTTY) {
    console.error(
      'Dette kjøres mot PRODUKSJON og krever bekreftelse. Kjør i en vanlig terminal, eller sett CONFIRM_PRODUCTION=1 hvis det er meningen.'
    )
    return false
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise((resolve) =>
    rl.question(`Dette kan endre PRODUKSJONS-databasen (${check.host}). Skriv «prod» for å fortsette: `, resolve)
  )
  rl.close()
  return answer.trim().toLowerCase() === 'prod'
}

if (name === 'prod' && guard && !(await confirmProduction())) {
  fail('Avbrutt. Ingenting ble kjørt.')
}

// The file wins over variables already set in the shell, and a leftover DOTENV_CONFIG_PATH can't redirect dotenv
const env = { ...process.env, ...vars, APP_ENV: name }
delete env.DOTENV_CONFIG_PATH

// npm adds node_modules/.bin to the PATH, but this also has to work when run directly with node
const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH'
env[pathKey] = path.resolve(process.cwd(), 'node_modules', '.bin') + path.delimiter + (env[pathKey] ?? '')

const child = spawn(command[0], command.slice(1), { stdio: 'inherit', env, shell: process.platform === 'win32' })
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
child.on('error', (error) => fail(`Kunne ikke starte «${command[0]}»: ${error.message}`))
