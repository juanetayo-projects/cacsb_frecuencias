'use client'

import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: string
  trendUp?: boolean
  helpText?: string
  variant?: 'default' | 'primary' | 'success' | 'warning'
  className?: string
}

export function MetricCard({
  title, value, icon, trend, trendUp, helpText, variant = 'default', className
}: MetricCardProps) {
  const variants = {
    default:  'bg-white border-gray-100',
    primary:  'bg-cacsb-700 text-white border-cacsb-600',
    success:  'bg-green-50 border-green-100',
    warning:  'bg-amber-50 border-amber-100',
  }

  return (
    <div className={cn(
      'card-odoo border p-5 relative group',
      variants[variant],
      className
    )}>
      {/* Tooltip de ayuda */}
      {helpText && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <HelpCircle className={cn('h-4 w-4', variant === 'primary' ? 'text-white/70' : 'text-gray-400')} />
            <div className="absolute right-0 top-5 w-56 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-50 hidden group-hover:block shadow-lg">
              {helpText}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(
            'text-xs font-medium uppercase tracking-wide mb-1',
            variant === 'primary' ? 'text-blue-200' : 'text-gray-500'
          )}>
            {title}
          </p>
          <p className={cn(
            'text-3xl font-bold',
            variant === 'primary' ? 'text-white' : 'text-cacsb-700'
          )}>
            {typeof value === 'number' ? value.toLocaleString('es-CO') : value}
          </p>
          {trend && (
            <p className={cn(
              'text-xs mt-1.5 flex items-center gap-1',
              trendUp ? 'text-green-600' : 'text-red-500'
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            'p-3 rounded-xl',
            variant === 'primary' ? 'bg-white/10' : 'bg-cacsb-50'
          )}>
            <div className={variant === 'primary' ? 'text-white' : 'text-cacsb-600'}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
