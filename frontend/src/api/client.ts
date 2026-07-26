import {
  HealthResponse,
  ContentSubmissionRequest,
  SubmissionResponse,
  ContentAnalysisResponse,
  SourceResponse,
  DashboardSummaryResponse,
  ContentListResponse,
  SourcesListResponse,
  ModelVersionChangelogResponse,
  CredibilityCardResponse,
} from '../types';

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
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Submission failed with status ${response.status}`);
  }
  return response.json();
}

export async function getContentAnalysis(contentId: string): Promise<ContentAnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/content/${contentId}`);
  if (!response.ok) {
    throw new Error(`Analysis fetch failed with status ${response.status}`);
  }
  return response.json();
}

export async function getSourceReputation(domain: string): Promise<SourceResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sources/${domain}`);
  if (!response.ok) {
    throw new Error(`Source lookup failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/summary`);
  if (!response.ok) {
    throw new Error(`Dashboard summary fetch failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchContentList(page: number = 1, pageSize: number = 20): Promise<ContentListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/content?page=${page}&page_size=${pageSize}`
  );
  if (!response.ok) {
    throw new Error(`Content list fetch failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchSources(page: number = 1, pageSize: number = 10): Promise<SourcesListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/sources?page=${page}&page_size=${pageSize}`
  );
  if (!response.ok) {
    throw new Error(`Sources list fetch failed with status ${response.status}`);
  }
  return response.json();
}

export function streamAnalysisProgress(
  contentId: string,
  onProgress: (phase: string, message: string) => void,
  onComplete: (data: ContentAnalysisResponse) => void,
  onError: (message: string) => void,
): () => void {
  const evtSource = new EventSource(
    `${API_BASE_URL}/api/v1/content/${contentId}/stream`
  );

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.phase === 'complete' || data.status === 'complete') {
        onComplete(data as ContentAnalysisResponse);
        evtSource.close();
      } else if (data.phase === 'failed' || data.status === 'failed') {
        onError(data.message || 'Analysis failed');
        evtSource.close();
      } else {
        onProgress(data.phase || 'unknown', data.message || '');
      }
    } catch {
      // ignore parse errors
    }
  };

  evtSource.onerror = () => {
    onError('Connection to analysis stream lost');
    evtSource.close();
  };

  return () => {
    evtSource.close();
  };
}

export async function fetchModelVersionChangelog(): Promise<ModelVersionChangelogResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/model-versions/changelog`);
  if (!response.ok) {
    throw new Error(`Changelog fetch failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchCredibilityCard(contentId: string): Promise<CredibilityCardResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/content/${contentId}/card`);
  if (!response.ok) {
    throw new Error(`Credibility card fetch failed with status ${response.status}`);
  }
  return response.json();
}
