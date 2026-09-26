const API_BASE =
  'http://127.0.0.1:8000'


export async function api(
  path,
  options = {},
) {
  const isFormData =
    options.body instanceof FormData

  const headers = {
    ...(options.headers || {}),
  }

  if (
    options.body &&
    !isFormData &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] =
      'application/json'
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
    }
  )

  let data = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
      `Request failed: ${response.status}`
    )
  }

  return data
}
