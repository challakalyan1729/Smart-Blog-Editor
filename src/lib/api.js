const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let message = `Request failed: ${response.status}`
    try {
      const payload = await response.json()
      if (payload?.detail) {
        message = payload.detail
      }
    } catch {
      // Keep fallback message.
    }
    throw new Error(message)
  }

  return response.json()
}

export async function fetchPosts() {
  const payload = await request('/api/posts/')
  return payload.posts || []
}

export async function fetchPost(postId) {
  return request(`/api/posts/${postId}`)
}

export async function createPost(payload) {
  return request('/api/posts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePost(postId, payload) {
  return request(`/api/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function publishPost(postId) {
  return request(`/api/posts/${postId}/publish`, {
    method: 'POST',
  })
}

export async function streamAIResponse(payload, onChunk) {
  const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('AI stream is not available from the backend.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event of events) {
      const lines = event.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          return
        }
        try {
          const parsed = JSON.parse(data)
          if (parsed?.chunk) {
            onChunk(parsed.chunk)
          }
        } catch {
          onChunk(data)
        }
      }
    }
  }
}
