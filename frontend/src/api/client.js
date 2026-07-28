const BASE_URL = 'http://localhost:8000/api';

function handleNetworkError(e) {
  if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
    const msg = "Can't reach the journal — is the backend running?";
    window.dispatchEvent(new CustomEvent('api-error', { detail: msg }));
    throw new Error(msg);
  }
  throw e;
}

async function handleResponse(response) {
  if (!response.ok) {
    let message = 'API Error';
    try {
      const data = await response.json();
      if (data.message) {
        message = data.message;
      } else if (data.error) {
        message = data.error;
      } else {
        message = JSON.stringify(data);
      }
    } catch (e) {
      message = response.statusText;
    }
    throw new Error(message);
  }
  return response.json();
}

export async function createEntry(audioBlob) {
  const formData = new FormData();
  formData.append('audio_path', audioBlob, 'recording.wav');

  try {
    const response = await fetch(`${BASE_URL}/entries/`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse(response);
  } catch (e) {
    return handleNetworkError(e);
  }
}

export async function getEntries() {
  try {
    const response = await fetch(`${BASE_URL}/entries/`);
    return await handleResponse(response);
  } catch (e) {
    return handleNetworkError(e);
  }
}

export async function getEntry(id) {
  try {
    const response = await fetch(`${BASE_URL}/entries/${id}/`);
    return await handleResponse(response);
  } catch (e) {
    return handleNetworkError(e);
  }
}

export async function searchEntries(query) {
  try {
    const response = await fetch(`${BASE_URL}/search/?q=${encodeURIComponent(query)}`);
    return await handleResponse(response);
  } catch (e) {
    return handleNetworkError(e);
  }
}
