import axios from 'axios'
import { readApiErrorBody, ApiRequestError } from '@/api/errors'
import { readGuestCartId, readMockScenario, readSessionToken } from '@/api/session-storage'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const http = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = readSessionToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const guestCartId = readGuestCartId()
  if (guestCartId) {
    config.headers['x-guest-cart'] = guestCartId
  }

  const scenario = readMockScenario()
  if (scenario) {
    config.headers['x-mock-scenario'] = scenario
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiRequestError(0, 'timeout', 'A resposta demorou. A mesma tentativa pode ser recuperada.'))
    }

    if (error instanceof ApiRequestError || !axios.isAxiosError(error)) {
      return Promise.reject(error)
    }

    const status = error.response?.status ?? 0
    const body = readApiErrorBody(error.response?.data)

    return Promise.reject(
      new ApiRequestError(
        status,
        body?.code ?? (status === 0 ? 'network' : 'unexpected'),
        body?.message ??
          (status === 0
            ? 'Não foi possível falar com a simulação.'
            : 'A simulação retornou um erro inesperado.'),
        body?.fields,
      ),
    )
  },
)
