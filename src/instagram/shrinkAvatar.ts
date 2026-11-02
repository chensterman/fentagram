const SIZE = 48

export async function shrinkAvatar(src: string): Promise<string | null> {
  try {
    const response = await fetch(src, { credentials: 'omit', referrer: 'https://www.instagram.com/' })
    if (!response.ok) return null
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const context = canvas.getContext('2d')
    if (!context) return null
    const side = Math.min(bitmap.width, bitmap.height)
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      SIZE,
      SIZE,
    )
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    return null
  }
}
