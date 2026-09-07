export type NotificationType = 'coding_test' | 'interview' | 'status_update' | 'application_confirmation'

export interface CandidateNotification {
  id: number
  type: NotificationType
  title: string
  message: string
  related_token: string | null
  is_read: boolean
  created_at: string
}
