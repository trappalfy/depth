import { statSync } from 'node:fs'
// sharp arrives with Next's image optimiser; this script is the only place the
// project uses it directly.
import sharp from 'sharp'

/**
 * Turns the delivered logo — a black mark on a near-white ground — into the
 * white, transparent mark the headers use.
 *
 * Alpha comes from how dark each pixel is rather than from a hard threshold, so
 * the antialiased edges survive as partial alpha instead of turning into a
 * stair-stepped cutout. The colour channel is white everywhere, which leaves
 * the diamond in the middle a real hole: on the dark navbar it shows the ink
 * behind it, exactly as it shows paper in the original.
 *
 * Run with: npm run generate:mark
 */

const SRC = 'assets/depth-logo.png'
const OUT = 'public/depth-mark.png'

/** At or below this luminance a pixel is ink: fully opaque. */
const INK = 24
/** At or above this luminance a pixel is paper: fully transparent. */
const PAPER = 236
/** Three times the largest place the mark is used (a 28px header lockup). */
const OUT_HEIGHT = 168

async function main(): Promise<void> {
  const { data, info } = await sharp(SRC)
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info

  const alpha = Buffer.alloc(width * height)
  for (let i = 0; i < alpha.length; i++) {
    const lum = data[i]
    alpha[i] =
      lum <= INK ? 255 : lum >= PAPER ? 0 : Math.round(((PAPER - lum) / (PAPER - INK)) * 255)
  }

  // Crop to the mark itself. The source carries a wide white margin, and a
  // header lockup has to align on the glyph, not on the artboard.
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] > 3) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const cropWidth = maxX - minX + 1
  const cropHeight = maxY - minY + 1

  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = 255
    rgba[i * 4 + 1] = 255
    rgba[i * 4 + 2] = 255
    rgba[i * 4 + 3] = alpha[i]
  }

  const outWidth = Math.round((cropWidth / cropHeight) * OUT_HEIGHT)
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropWidth, height: cropHeight })
    .resize({ width: outWidth, height: OUT_HEIGHT, fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(OUT)

  console.log(`${OUT}: ${outWidth}x${OUT_HEIGHT}, ${statSync(OUT).size} bytes`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
