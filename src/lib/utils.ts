import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

// Calendar-day identity, independent of the browser's/server's local timezone.
// Dates in this app represent whole days (meal plans), so all day comparisons
// and lookups should key off the UTC calendar date rather than local Date
// methods like toDateString(), which can disagree between client and server.
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function utcMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day))
}

// Today in Norway, as a whole day (UTC midnight) like the meal plan dates
export function osloToday(now: Date = new Date()): Date {
  return new Date(`${now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' })}T00:00:00.000Z`)
}

// Monday of the week the day is in (UTC calendar days)
export function mondayOf(day: Date): Date {
  const monday = utcMidnight(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())
  const dayOfWeek = monday.getUTCDay() // 0 = Sunday, 1 = Monday, ...
  monday.setUTCDate(monday.getUTCDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek))
  return monday
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const base64Data = base64.split(',')[1]
      resolve({
        base64: base64Data,
        mimeType: file.type
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function validateImage(file: File): boolean {
  const maxSize = 2 * 1024 * 1024 // 2MB
  return file.size <= maxSize && file.type.startsWith('image/')
}

export function createImageUrl(image: { base64: string; mimeType: string }): string {
  return `data:${image.mimeType};base64,${image.base64}`
}
