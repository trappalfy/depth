import { readSnapshot } from '@/lib/snapshot'

export const dynamic = 'force-static'
export const revalidate = 30

export async function GET() {
  try {
    const snapshot = await readSnapshot()
    return Response.json(snapshot)
  } catch (error) {
    return Response.json(
      { error: 'upstream RPC unavailable', message: String(error) },
      { status: 503 },
    )
  }
}
