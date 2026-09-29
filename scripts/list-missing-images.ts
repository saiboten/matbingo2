import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
const r = await prisma.recipe.findMany({ where: { imageUrl: null, image: null }, select: { id: true, name: true, family: { select: { name: true } } } })
const b = await prisma.blueprint.findMany({ where: { imageUrl: null, image: null }, select: { id: true, name: true } })
const tr = await prisma.recipe.count(), tb = await prisma.blueprint.count()
console.log(`recipes ${r.length}/${tr} missing, blueprints ${b.length}/${tb} missing`)
console.log('RECIPES', JSON.stringify(r))
console.log('BLUEPRINTS', JSON.stringify(b))
await prisma.$disconnect()
