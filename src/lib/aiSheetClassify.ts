// เรียก backend ให้ AI ช่วยจำแนก sheet ที่ตัวจำแนกอัตโนมัติไม่รู้จัก
// ใช้ endpoint เดียวกับ requirement-check (VITE_AI_ENDPOINT) แต่คนละ path

export interface AiSheetMap {
  kind: 'vm' | 'service' | 'none'
  headerRowIndex: number
  serviceTypeDefault: string
  columns: { index: number; field: string }[]
  note: string
}

const CHECK_ENDPOINT = (import.meta.env as Record<string, string | undefined>).VITE_AI_ENDPOINT

const CLASSIFY_ENDPOINT = CHECK_ENDPOINT
  ? CHECK_ENDPOINT.replace(/\/api\/[^/]*$/, '') + '/api/classify-sheet'
  : undefined

export function aiClassifyConfigured(): boolean {
  return !!CLASSIFY_ENDPOINT
}

export async function classifySheetWithAI(sheetName: string, matrix: unknown[][]): Promise<AiSheetMap> {
  if (!CLASSIFY_ENDPOINT) throw new Error('ยังไม่ได้ตั้งค่า AI endpoint (VITE_AI_ENDPOINT)')
  const rows = matrix
    .slice(0, 15)
    .map((r) => (Array.isArray(r) ? r.slice(0, 40).map((c) => String(c ?? '').slice(0, 80)) : []))
  const res = await fetch(CLASSIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheetName, rows }),
  })
  if (!res.ok) throw new Error('เรียก AI ไม่สำเร็จ (' + res.status + ')')
  return (await res.json()) as AiSheetMap
}
