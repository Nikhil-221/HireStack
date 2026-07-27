import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { clearToken, getToken, login as loginRequest, setToken } from '@/api/auth'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken())

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token),
      login: async (username: string, password: string) => {
        const accessToken = await loginRequest(username, password)
        setToken(accessToken)
        setTokenState(accessToken)
      },
      logout: () => {
        clearToken()
        setTokenState(null)
      },
    }),
    [token]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
