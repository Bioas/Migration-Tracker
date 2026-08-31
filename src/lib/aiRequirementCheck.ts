import { Project } from '../types/project'

// AI-powered analysis. Because API keys must never live in the browser, this
// calls YOUR backend endpoint (set VITE_AI_ENDPOINT), which in turn calls the
// Claude API server-side and returns structured JSON. Falls back gracefully
// when no endpoint is configured.

export interface AiCheckResponse {
  score: number
  summary: string
  missing: { item: string; why: string }[]
  questions: string[]
}

const ENDPOINT = (import.meta.env as Record<string, string | undefined>).VITE_AI_ENDPOINT

export function aiEndpointConfigured(): boolean {
  return !!ENDPOINT
}

export async function checkWithAI(project: Project): Promise<AiCheckResponse> {
  if (!ENDPOINT) throw new Error('ยังไม่ได้ตั้งค่า AI endpoint (VITE_AI_ENDPOINT)')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project }),
  })
  if (!res.ok) throw new Error('เรียก AI ไม่สำเร็จ (' + res.status + ')')
  return (await res.json()) as AiCheckResponse
}
