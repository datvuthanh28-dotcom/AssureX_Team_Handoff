import axios from 'axios'

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:8000/api`
).replace(/\/+$/, '')

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
})

const ERROR_MESSAGES = {
  400: 'Please check the submitted information.',
  401: 'Your session is no longer valid. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'Claim not found.',
  409: 'Claim ID already exists.',
  422: 'Please check the required fields.',
  500: 'AssureX could not complete the request. Please try again.',
}

export async function api(path, options = {}) {
  const url = path.startsWith('/api/')
    ? path.slice(4)
    : path
  let data = options.body

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      data = options.body
    }
  }

  try {
    const response = await apiClient.request({
      url,
      method: options.method || 'GET',
      data,
      headers: options.headers,
    })
    return response.data
  } catch (error) {
    const status = error.response?.status
    const message = status
      ? ERROR_MESSAGES[status] || 'The request failed. Please try again.'
      : 'Unable to connect to AssureX backend.'

    throw new Error(message)
  }
}
