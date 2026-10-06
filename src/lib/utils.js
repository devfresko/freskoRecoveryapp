import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function inr(n) {
  const v = Number(n) || 0
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export function inrFull(n) {
  const v = Number(n) || 0
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
