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

export interface DimensionScores {
  factual_accuracy: number;
  source_reputation: number;
  manipulation_tactics: number;
  clickbait_risk?: number;
  virality_risk?: number;
  bias: string;
  temporal_consistency: number;
  is_satire?: boolean;
}

export interface ManipulationTactic {
  key: string;
  label: string;
  description: string;
}

export interface ReasoningChain {
  summary: string;
  source_reputation_notes?: string;
  corroboration_notes?: string;
  claims_checked_count?: number;
  detected_manipulation_tactics?: ManipulationTactic[];
  satire_info?: {
    is_satire: boolean;
    reason?: string;
    satire_label?: string;
  };
}

export interface CorroboratingSource {
  title?: string;
  source?: string;
  url?: string;
  published_at?: string;
  textual_rating?: string;
  provider: string;
}

export interface ClaimItem {
  id: string;
  content_item_id: string;
  claim_text: string;
  extracted_speaker?: string;
  verdict: 'supported' | 'contradicted' | 'unverified';
  confidence_score: number;
  confidence_interval?: {
    lower: number;
    upper: number;
    margin: number;
  };
  evidence_summary: string;
  reasoning_chain?: {
    notes?: string;
    corroborating_references?: CorroboratingSource[];
  };
  created_at: string;
  ttl_expires_at?: string;
}

export interface ContentAnalysisResponse {
  content_id: string;
  modality: ModalityType;
  url?: string;
  title?: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  composite_score?: number;
  confidence_interval?: {
    lower: number;
    upper: number;
    margin: number;
  };
  dimension_scores?: DimensionScores;
  reasoning_chain?: ReasoningChain;
  corroborating_sources?: CorroboratingSource[];
  claims?: ClaimItem[];
  model_version?: string;
  created_at: string;
}

export interface SourceResponse {
   id: string;
   domain: string;
   name: string;
   historical_accuracy_score: number;
   bias_rating: string;
   whois_age_days?: number;
   is_known_satire: boolean;
   is_known_misinfo: boolean;
   label: string;
 }
 
 export interface ContentItemSummary {
  id: string;
  title: string | null;
  raw_payload?: string | null;
  source_domain: string | null;
  status: string;
  verdict: string | null;
  claims_count: number;
  composite_score: number | null;
  created_at: string;
}
 
 export interface ContentListResponse {
   items: ContentItemSummary[];
   total: number;
   page: number;
   page_size: number;
 }
 
 export interface DashboardSummaryResponse {
   analyses_count_this_week: number;
   avg_factual_accuracy: number | null;
   sources_flagged_count: number;
   avg_turnaround_seconds: number | null;
 }
 
 export interface SourceListItem {
   id: string;
   domain: string;
   name: string;
   score: number;
   trend_label: string;
 }
 
 export interface SourcesListResponse {
   items: SourceListItem[];
   total: number;
   page: number;
   page_size: number;
 }
 
 export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  redis: string;
}

export interface ModelVersionEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export interface ModelVersionChangelogResponse {
  current_version: string;
  entries: ModelVersionEntry[];
}

export interface CredibilityCardResponse {
  content_id: string;
  title: string | null;
  composite_score: number | null;
  confidence_interval: {
    lower: number;
    upper: number;
    margin: number;
  } | null;
  dimension_scores: Record<string, any> | null;
  verdict: string | null;
  claims_count: number;
  model_version: string | null;
  created_at: string;
  source_domain: string | null;
}

export interface CorrectionSubmissionRequest {
  proposed_verdict: 'supported' | 'contradicted' | 'unverified';
  evidence_text: string;
  evidence_urls?: string[];
}

export interface ClaimCorrectionResponse {
  id: string;
  claim_id: string;
  contributor_id: string;
  proposed_verdict: 'supported' | 'contradicted' | 'unverified';
  evidence_text: string;
  evidence_urls: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id?: string;
  review_notes?: string;
  created_at: string;
  reviewed_at?: string;
  contributor_name?: string;
  contributor_role?: string;
}

export interface ReviewQueueItem {
  correction_id: string;
  claim_id: string;
  claim_text: string;
  original_verdict: string;
  proposed_verdict: string;
  evidence_text: string;
  evidence_urls: string[];
  submitted_at: string;
  contributor_name: string;
  contributor_role: string;
  contributor_reputation: number;
}

export interface ReviewQueueListResponse {
  items: ReviewQueueItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ContributorResponse {
  id: string;
  user_id: string;
  role: string;
  reputation_score: number;
  verified_submissions_count: number;
  accuracy_rate: number;
  full_name?: string;
}

export interface LeaderboardResponse {
  items: ContributorResponse[];
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
  secret_key?: string | null;
}
