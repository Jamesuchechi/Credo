export type ModalityType = 'url' | 'text' | 'image' | 'video' | 'audio' | 'screenshot' | 'social_post';

export interface ContentSubmissionRequest {
  modality: ModalityType;
  payload: string;
  metadata?: Record<string, string>;
}

export interface SubmissionResponse {
  content_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  message?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  redis: string;
}
