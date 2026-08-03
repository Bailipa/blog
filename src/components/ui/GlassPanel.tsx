import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const glassPanel = cva('glass-panel', {
  variants: {
    intensity: {
      sm: 'supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:backdrop-saturate-110',
      md: 'supports-[backdrop-filter]:backdrop-blur-lg supports-[backdrop-filter]:backdrop-saturate-120',
      lg: 'supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-130',
    },
  },
  defaultVariants: { intensity: 'md' },
})

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassPanel> {}

export function GlassPanel({ className, intensity, ...props }: GlassPanelProps) {
  return <div className={cn(glassPanel({ intensity }), className)} {...props} />
}
