import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { clearToken, getToken, login as loginRequest, setToken, type UserRole } from '@/api/auth'

interface AuthContextValue {
  isAuthenticated: boolean
  role: UserRole | null
  login: (username: string, password: string) => Promise<UserRole | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken())
  const role = getRoleFromToken(token)

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token),
      role,
      login: async (username: string, password: string) => {
        const accessToken = await loginRequest(username, password)
        setToken(accessToken)
        setTokenState(accessToken)
        return getRoleFromToken(accessToken)
      },
      logout: () => {
        clearToken()
        setTokenState(null)
      },
    }),
    [token, role]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function getRoleFromToken(token: string | null): UserRole | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(payload)) as { role?: string }
    return decoded.role === 'recruiter' || decoded.role === 'candidate' || decoded.role === 'admin'
      ? decoded.role
      : null
  } catch {
    return null
  }
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
