import 'dotenv/config'
import pg from 'pg'
import { guessAisle, AISLE_ORDER } from '../src/lib/aisle'

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const r = await c.query('select "ingredients" from "Recipe"')
await c.end()

const names = new Map<string, string>()
for (const row of r.rows) for (const x of row.ingredients.split(',')) { const n = x.trim(); if (n) names.set(n.toLowerCase(), n) }

const groups: Record<string, string[]> = {}
for (const n of [...names.values()].sort((a, b) => a.localeCompare(b))) (groups[guessAisle(n)] ??= []).push(n)
for (const a of AISLE_ORDER) console.log(`\n## ${a} (${groups[a]?.length ?? 0})\n${(groups[a] ?? []).join(' | ')}`)
