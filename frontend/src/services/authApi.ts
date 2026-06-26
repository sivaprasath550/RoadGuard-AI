// authApi.ts — thin wrappers around the auth API endpoints.
//
// These functions are called by React Query's useMutation() and useQuery().
// They have no knowledge of React state — pure async functions.
// This makes them independently testable.

import { api } from './api'
import { AuthResponse, LoginInput, RegisterInput, User } from '../types'

export const authApi = {
  // Sends registration data, server sets auth cookies in response
  register: async (data: RegisterInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  login: async (data: LoginInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data)
    return response.data
  },

  // Clears auth cookies server-side
  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  // Fetches the currently authenticated user using the cookie
  getMe: async (): Promise<User> => {
    const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me')
    return response.data.data.user
  },
}
