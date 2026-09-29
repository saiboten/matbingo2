import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
const DIR = process.env.STOCK_DIR!
const cache = JSON.parse(fs.readFileSync(path.join(DIR,'search.json'),'utf8'))
const dishes = ['hot dog','chicken ciabatta sandwich','chicken sandwich','cod fillet','taco soup','chicken stir fry','vegetarian chili beans','vegetarian wraps','chickpea tomato pasta','pesto salmon','vegetarian moussaka','salmon fillet']
const W=300,H=200
const layers:any[]=[]
for (let row=0; row<dishes.length; row++){
  const photos = cache[dishes[row]]
  for (let col=0; col<photos.length; col++){
    const bytes = Buffer.from(await (await fetch(photos[col].small)).arrayBuffer())
    const tile = await sharp(bytes).resize(W,H,{fit:'cover'}).toBuffer()
    const label = Buffer.from(`<svg width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="22" fill="#000" fill-opacity=".65"/><text x="6" y="16" font-size="14" fill="#fff" font-family="Arial">${row}.${col}  ${dishes[row]}</text></svg>`)
    layers.push({input: await sharp(tile).composite([{input:label}]).toBuffer(), left: col*W, top: row*H})
  }
}
const out = path.join(DIR,'sheet-remaining.jpg')
await sharp({create:{width:W*4,height:H*dishes.length,channels:3,background:'#fff'}}).composite(layers).jpeg({quality:80}).toFile(out)
console.log(out)
