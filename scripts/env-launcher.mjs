// Pure helpers for scripts/with-env.mjs, kept separate so they can be unit tested.

export const ENVIRONMENTS = ['dev', 'prod']

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]']

export function envFileFor(name) {
  return `.env.${name}`
}

export function parseDatabaseUrl(url) {
  try {
    const parsed = new URL(url ?? '')
    return { host: parsed.hostname, database: parsed.pathname.replace(/^\//, '') }
  } catch {
    return null
  }
}

export function isLocalHost(host) {
  return LOCAL_HOSTS.includes(host)
}

// Checks that an environment file is what its name says: dev must use a database on this machine,
// prod must not, and both must have a database URL. Returns { ok, errors, host, database }.
export function validateEnvironment(name, vars) {
  const errors = []
  const target = parseDatabaseUrl(vars.DATABASE_URL)

  if (!ENVIRONMENTS.includes(name)) {
    errors.push(`Ukjent miljø «${name}». Bruk ${ENVIRONMENTS.join(' eller ')}.`)
  }
  if (!target) {
    errors.push(`${envFileFor(name)} mangler en gyldig DATABASE_URL.`)
  } else if (name === 'dev' && !isLocalHost(target.host)) {
    errors.push(
      `${envFileFor(name)} peker på «${target.host}», ikke en lokal database. Dev-miljøet skal alltid være lokalt.`
    )
  } else if (name === 'prod' && isLocalHost(target.host)) {
    errors.push(`${envFileFor(name)} peker på en lokal database, men er ment å være produksjon.`)
  }

  return { ok: errors.length === 0, errors, host: target?.host ?? '', database: target?.database ?? '' }
}

// The line printed before anything runs, so it is always clear which database is in play
export function describeTarget(name, target) {
  return name === 'prod'
    ? `⚠  PRODUKSJON  →  databasen «${target.database}» på ${target.host}  (ekte data!)`
    : `Miljø: dev  →  databasen «${target.database}» på ${target.host}`
}
