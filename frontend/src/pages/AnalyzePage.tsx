import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Image,
  Video,
  Share2,
  UploadCloud,
  ArrowRight,
  Info,
  Layers,
} from 'lucide-react';
import { submitContent } from '../api/client';
import { ModalityType } from '../types';

export const AnalyzePage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'link' | 'text' | 'image' | 'media' | 'social' | 'batch'>('link');
  const [submitPayload, setSubmitPayload] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Advanced Analysis Options
  const [targetLang, setTargetLang] = useState('en');
  const [verificationStrictness, setVerificationStrictness] = useState<'standard' | 'high' | 'rigorous'>('high');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setSubmitError(null);

    let payloadToSend = submitPayload.trim();
    let modality: ModalityType = 'url';

    if (selectedFile) {
      try {
        payloadToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
        modality = selectedFile.type.startsWith('image/') ? 'image' : 'video';
      } catch (err) {
        setIsSubmitting(false);
        setSubmitError('Failed to read uploaded file.');
        return;
      }
    } else if (activeTab === 'image') {
      modality = 'image';
    } else if (activeTab === 'media') {
      modality = 'video';
    } else if (activeTab === 'social') {
      modality = 'social_post';
    } else if (activeTab === 'text' || activeTab === 'batch') {
      modality = 'text';
    } else {
      const isUrl = payloadToSend.startsWith('http://') || payloadToSend.startsWith('https://');
      modality = isUrl ? 'url' : 'text';
    }

    if (!payloadToSend) {
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await submitContent({ modality, payload: payloadToSend });
      setIsSubmitting(false);
      setSubmitPayload('');
      setSelectedFile(null);
      navigate(`/dashboard/analysis/${res.content_id}`);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Verification submission failed');
    }
  };

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '28px', fontWeight: 600, margin: 0 }}>
              Multi-Modal Verification Workbench
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Submit URLs, raw text, image screenshots (OCR), audio/video (Whisper), or social posts for automated factual analysis.
            </p>
          </div>
        </div>
      </header>

      {submitError && (
        <div style={{ background: 'var(--disputed-dim)', border: '1px solid var(--disputed)', borderRadius: '10px', padding: '14px 20px', marginBottom: '24px', color: 'var(--disputed)', fontSize: '13.5px' }}>
          {submitError}
        </div>
      )}

      {/* Workbench Input Card */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '32px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Sparkles size={20} color="var(--brass)" />
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
            Select Verification Input Type
          </span>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'link', label: 'Web Link / Article', icon: LinkIcon },
            { id: 'text', label: 'Raw Text / Statement', icon: FileText },
            { id: 'image', label: 'Image / OCR Screenshot', icon: Image },
            { id: 'media', label: 'Audio / Video Broadcast', icon: Video },
            { id: 'social', label: 'Social Thread', icon: Share2 },
            { id: 'batch', label: 'Batch / Chain Thread', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedFile(null);
                }}
                style={{
                  background: isActive ? 'var(--brass)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--text-dim)',
                  border: isActive ? 'none' : '1px solid var(--line)',
                  borderRadius: '100px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontFamily: 'var(--mono)',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          {(activeTab === 'image' || activeTab === 'media') && (
            <div
              style={{
                background: 'var(--surface-2)',
                border: '2px dashed var(--line)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <UploadCloud size={32} color="var(--brass)" style={{ marginBottom: '10px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                Upload Local {activeTab === 'image' ? 'Image File (PNG, JPG, WEBP)' : 'Media File (MP4, MP3, WAV)'}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', margin: '0 0 14px 0' }}>
                OCR & Speech-to-text algorithms will parse embedded claims automatically.
              </p>
              <input
                type="file"
                accept={activeTab === 'image' ? 'image/*' : 'video/*,audio/*'}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{ fontSize: '13px', color: 'var(--text)' }}
                disabled={isSubmitting}
              />
              {selectedFile && (
                <div style={{ marginTop: '12px', fontSize: '12.5px', fontFamily: 'var(--mono)', color: 'var(--verified)', fontWeight: 600 }}>
                  Ready to process: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <textarea
              rows={activeTab === 'batch' || activeTab === 'text' ? 5 : 2}
              placeholder={
                activeTab === 'link'
                  ? 'Paste article URL or website link (e.g., https://news.com/article)...'
                  : activeTab === 'text'
                    ? 'Paste raw text claim, press release, or statement excerpt...'
                    : activeTab === 'image'
                      ? 'Paste image URL or choose a local file above...'
                      : activeTab === 'media'
                        ? 'Paste video/audio URL or choose a media file above...'
                        : activeTab === 'social'
                          ? 'Paste Twitter/X thread link or WhatsApp post...'
                          : 'Paste multi-message forwarded chain or thread (one per line)...'
              }
              value={submitPayload}
              onChange={(e) => setSubmitPayload(e.target.value)}
              disabled={isSubmitting || !!selectedFile}
              style={{
                width: '100%',
                background: 'var(--ink-2)',
                border: '1px solid var(--line-strong)',
                borderRadius: '12px',
                padding: '16px',
                color: 'var(--text)',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: activeTab === 'batch' ? 'var(--mono)' : 'inherit',
              }}
            />
          </div>

          {/* Advanced Model Parameters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              background: 'var(--surface-2)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--line)',
              marginBottom: '24px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Cross-Lingual Target Language
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '8px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
              >
                <option value="en">English (Default)</option>
                <option value="ha">Hausa</option>
                <option value="yo">Yoruba</option>
                <option value="ig">Igbo</option>
                <option value="sw">Swahili</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)', marginBottom: '6px' }}>
                Verification Rigor Level
              </label>
              <select
                value={verificationStrictness}
                onChange={(e) => setVerificationStrictness(e.target.value as any)}
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line)', padding: '8px 12px', borderRadius: '8px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
              >
                <option value="standard">Standard (Fast Cross-Check)</option>
                <option value="high">High Rigor (Multi-Source News API + Fact Check)</option>
                <option value="rigorous">Exhaustive (Deep LLM Reasoning Chain)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} /> Pipeline will compute claim decomposition, source WHOIS age, and bias axis.
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!submitPayload.trim() && !selectedFile)}
              style={{
                background: 'var(--brass)',
                color: 'var(--ink)',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isSubmitting || (!submitPayload.trim() && !selectedFile) ? 0.6 : 1,
              }}
            >
              {isSubmitting ? <Sparkles size={16} style={{ animation: 'spin 2s linear infinite' }} /> : <ArrowRight size={16} />}
              {isSubmitting ? 'Executing Verification Pipeline...' : 'Run Factual Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
