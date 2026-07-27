import axios from 'axios'

const TOKEN_KEY = 'hirestack_token'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export async function login(username: string, password: string): Promise<string> {
  const form = new URLSearchParams()
  form.set('username', username)
  form.set('password', password)

  const response = await axios.post<{ access_token: string; token_type: string }>(
    `${API_BASE_URL}/auth/token`,
    form,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  return response.data.access_token
}

export type RecruiterRole = 'recruiter'

export interface RegisterPayload {
  name: string
  email: string
  username: string
  password: string
  role: RecruiterRole
}

export async function register(payload: RegisterPayload): Promise<void> {
  await axios.post(`${API_BASE_URL}/auth/register`, payload)
}
