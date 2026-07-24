import { HealthResponse, ContentSubmissionRequest, SubmissionResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}

export async function submitContent(data: ContentSubmissionRequest): Promise<SubmissionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    throw new Error(`Submission failed with status ${response.status}`);
  }
  return response.json();
}
