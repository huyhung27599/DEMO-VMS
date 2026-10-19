import { queryOptions } from '@tanstack/react-query'
import { fetchEventEvidenceBundle } from './evidence'
import type { AnyRow } from './lib'

export const statisticsKeys = {
  all: ['statistics'] as const,
  evidence: (event: AnyRow | null) => ['statistics', 'evidence', event] as const,
}

/**
 * openEventModal (events.js:1226-1245): mỗi lần mở modal gọi fetchEventEvidenceBundle(event) một lần.
 * Component chỉ bật query khi modal mở; staleTime 0 + đổi enabled false -> true => mỗi lần mở lại đều fetch.
 * Không polling.
 */
export const eventEvidenceQueryOptions = (event: AnyRow | null) =>
  queryOptions({
    queryKey: statisticsKeys.evidence(event),
    queryFn: () => fetchEventEvidenceBundle(event as AnyRow),
    refetchInterval: false,
  })
