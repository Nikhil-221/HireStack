import { apiClient } from './client'
import type { CandidateNotification } from '@/types/notification'

export async function fetchNotifications(): Promise<CandidateNotification[]> {
  const response = await apiClient.get<CandidateNotification[]>('/candidate/notifications')
  return response.data
}

export async function markNotificationRead(id: number): Promise<CandidateNotification> {
  const response = await apiClient.patch<CandidateNotification>(`/candidate/notifications/${id}/read`)
  return response.data
}
