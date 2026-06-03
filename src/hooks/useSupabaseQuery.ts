import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UseQueryOptions {
  table: string
  select?: string
  filters?: Record<string, unknown>
  orderBy?: { column: string; ascending?: boolean }
  limit?: number
}

interface QueryResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useSupabaseQuery<T = Record<string, unknown>>({
  table, select = '*', filters = {}, orderBy, limit
}: UseQueryOptions): QueryResult<T> {
  const [data,    setData]    = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  const refetch = () => setTick(t => t + 1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        let query = supabase.from(table).select(select)

        Object.entries(filters).forEach(([col, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            query = query.eq(col, val) as typeof query
          }
        })

        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true }) as typeof query
        }
        if (limit) {
          query = query.limit(limit) as typeof query
        }

        const { data: rows, error: err } = await query
        if (cancelled) return
        if (err) { setError(err.message); setData([]) }
        else      { setData((rows as T[]) || []) }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [table, select, JSON.stringify(filters), orderBy?.column, limit, tick])

  return { data, loading, error, refetch }
}
