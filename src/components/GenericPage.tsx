import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function GenericPage({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col animate-fade-in w-full',
        !children && 'items-center justify-center min-h-[calc(100vh-10rem)] text-center',
      )}
    >
      <div className={cn(