import { Project } from '../types/project'
import type { CheckResult } from './requirementCheck'
import type { AiCheckResponse } from './aiRequirementCheck'

/** ตั้งความกว้างคอลัมน์ให้อ่านง่ายเมื่อเปิดใน Excel */
function withWidths<T>(sheet: T, widths: number[]): T {
  ;(sheet as Record<string, unknown>)['!cols'] = widths.map((w) => ({ wch: w }))
  return sheet
}

const SEVERITY_LABEL = { error: 'ต้องแก้', warning: 'ควรตรวจสอบ' } as const

/**
 * สร้างไฟล์ Excel สรุปผลการตรวจสอบความครบถ้วน พร้อมส่งให้ลูกค้า
 * 4 sheet: สรุป / ข้อมูลที่ยังขาด / ข้อมูลขัดแย้ง / คำถามส่งลูกค้า
 */
export async function exportCheckReport(
  project: Project,
  result: CheckResult,
  ai?: AiCheckResponse | null
): Promise<void> {
  const XLSX = await import('xlsx')
  const now = new Date()
  const dateText = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')

  const score = ai ? ai.score : result.score
  const questions = ai?.questions ?? result.questions

  // 1) สรุป
  const summaryRows: (string | number)[][] = [
    ['สรุปผลการตรวจสอบความครบถ้วนของข้อมูล'],
    [],
    ['โปรเจกต์', project.projectName],
    ['ลูกค้า', project.customer || '-'],
    ['ผู้ดูแล', project.projectOwner || '-'],
    ['วันที่ตรวจ', dateText],
    [],
    ['ความครบถ้วน', score + '%'],
    ['ช่องข้อมูลที่กรอกแล้ว', result.filledFields + ' / ' + result.totalFields],
    ['VM ที่ข้อมูลครบ', result.completeVms + ' / ' + result.vmCount + ' เครื่อง'],
    ['Service ที่ข้อมูลครบ', result.completeServices + ' / ' + result.serviceCount + ' รายการ'],
    ['รายการที่ข้อมูลยังไม่ครบ', result.gaps.length],
    ['ข้อมูลที่ขัดแย้งกัน', result.conflicts.length],
    ['คำถามที่ต้องสอบถามลูกค้า', questions.length],
  ]
  if (ai?.summary) summaryRows.push([], ['สรุปโดย AI', ai.summary])

  // 2) ข้อมูลที่ยังขาด
  const gapRows: (string | number)[][] = [
    ['ประเภท', 'ชื่อรายการ', 'รายละเอียด', 'กรอกแล้ว', 'ทั้งหมด', 'ข้อมูลที่ยังขาด'],
    ...result.gaps.map((g) => [g.category, g.name, g.subtitle, g.filled, g.total, g.missing.join(', ')]),
  ]
  if (result.gaps.length === 0) gapRows.push(['—', 'ข้อมูลครบทุกรายการ', '', '', '', ''])

  // 3) ข้อมูลขัดแย้ง
  const conflictRows: (string | number)[][] = [
    ['ระดับ', 'หัวข้อ', 'รายละเอียด', 'รายการที่เกี่ยวข้อง'],
    ...result.conflicts.map((c) => [
      SEVERITY_LABEL[c.severity],
      c.title,
      c.detail,
      c.refs.map((r) => r.name).join(', '),
    ]),
  ]
  if (result.conflicts.length === 0) conflictRows.push(['—', 'ไม่พบข้อมูลขัดแย้ง', '', ''])

  // 4) คำถามส่งลูกค้า
  const questionRows: (string | number)[][] = [
    ['ลำดับ', 'คำถาม'],
    ...questions.map((q, i) => [i + 1, q]),
  ]
  if (questions.length === 0) questionRows.push(['—', 'ข้อมูลครบถ้วน ไม่มีคำถามเพิ่มเติม'])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, withWidths(XLSX.utils.aoa_to_sheet(summaryRows), [26, 60]), 'สรุป')
  XLSX.utils.book_append_sheet(
    wb,
    withWidths(XLSX.utils.aoa_to_sheet(gapRows), [10, 24, 22, 10, 10, 60]),
    'ข้อมูลที่ยังขาด'
  )
  XLSX.utils.book_append_sheet(
    wb,
    withWidths(XLSX.utils.aoa_to_sheet(conflictRows), [14, 44, 56, 30]),
    'ข้อมูลขัดแย้ง'
  )
  XLSX.utils.book_append_sheet(wb, withWidths(XLSX.utils.aoa_to_sheet(questionRows), [8, 100]), 'คำถามส่งลูกค้า')

  const safeName = (project.projectName || 'project').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60).trim()
  XLSX.writeFile(wb, `ตรวจสอบข้อมูล-${safeName}-${stamp}.xlsx`)
}
