import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Globe,
  Monitor,
  Save,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'language' | 'notifications' | 'sessions' | 'privacy'>('profile');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Preferences state
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [sseAlerts, setSseAlerts] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [dataRetentionDays, setDataRetentionDays] = useState('365');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess('Profile settings updated successfully!');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSavePreferences = () => {
    setSaveSuccess('Preferences saved successfully!');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
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
              Account & Platform Settings
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Manage your personal credentials, cross-lingual defaults, notification webhooks, and security sessions.
            </p>
          </div>
        </div>
      </header>

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--verified-dim)',
            border: '1px solid var(--verified)',
            borderRadius: '10px',
            color: 'var(--verified)',
            fontSize: '13.5px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
        {[
          { id: 'profile', label: 'Profile & Security', icon: User },
          { id: 'language', label: 'Regional & Language', icon: Globe },
          { id: 'notifications', label: 'Notifications & Webhooks', icon: Bell },
          { id: 'sessions', label: 'Active Sessions', icon: Monitor },
          { id: 'privacy', label: 'Privacy & Retention', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: isActive ? 'var(--brass)' : 'transparent',
                color: isActive ? 'var(--ink)' : 'var(--text-dim)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontFamily: 'var(--mono)',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROFILE & SECURITY */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
              Personal Profile
            </h3>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
              Security & Password
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>New Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSavePreferences}
                style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--line)', padding: '10px 22px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGIONAL & LANGUAGE */}
      {activeTab === 'language' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
            Cross-Lingual & Regional Defaults
          </h3>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
              Primary Interface & Translation Language
            </label>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', margin: '0 0 12px 0' }}>
              Credo's cross-lingual model translates non-English audio/text claims into this target language for verification.
            </p>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              style={{ width: '100%', maxWidth: '400px', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none', fontFamily: 'var(--mono)' }}
            >
              <option value="en">English (Global)</option>
              <option value="ha">Hausa (Northern Nigeria & West Africa)</option>
              <option value="yo">Yoruba (South-West Nigeria & Benin)</option>
              <option value="ig">Igbo (South-East Nigeria)</option>
              <option value="sw">Swahili (East Africa)</option>
              <option value="am">Amharic (Ethiopia)</option>
              <option value="fr">French (Francophone Africa)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Automatic Translation Overlay</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>Automatically render translated claim cards alongside original dialect text.</div>
            </div>
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--brass)', cursor: 'pointer' }}
            />
          </div>

          <button onClick={handleSavePreferences} style={{ background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            Save Regional Settings
          </button>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS & WEBHOOKS */}
      {activeTab === 'notifications' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
            Notifications & Live Webhooks
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Weekly Credibility Digest Email</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>Receive a weekly breakdown of checked claims, trending viral misinfo, and source shifts.</div>
              </div>
              <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--brass)', cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Real-Time SSE Alert Triggers</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>Receive live browser notifications when background worker completes analysis.</div>
              </div>
              <input type="checkbox" checked={sseAlerts} onChange={(e) => setSseAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--brass)', cursor: 'pointer' }} />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              Custom Webhook Endpoint URL
            </label>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', margin: '0 0 10px 0' }}>
              Credo will dispatch a POST payload to this endpoint whenever an analysis verdict is completed.
            </p>
            <input
              type="url"
              placeholder="https://api.yourdomain.com/webhooks/credo"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
            />
          </div>

          <button onClick={handleSavePreferences} style={{ background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            Save Notification Webhooks
          </button>
        </div>
      )}

      {/* TAB 4: SESSIONS */}
      {activeTab === 'sessions' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
            Active Browser Sessions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
            <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Monitor size={24} color="var(--brass)" />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                    Linux Chrome Browser <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--verified)', background: 'var(--verified-dim)', padding: '2px 8px', borderRadius: '100px', marginLeft: '6px' }}>Current Session</span>
                  </div>
                  <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                    IP: 102.89.23.14 · Active Now
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={logout} style={{ background: 'var(--disputed)', color: 'var(--ink)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={16} /> Sign Out of All Sessions
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: PRIVACY */}
      {activeTab === 'privacy' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
            Data Retention & Compliance
          </h3>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
              Automated Data Purging Period
            </label>
            <select
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(e.target.value)}
              style={{ width: '100%', maxWidth: '350px', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none', fontFamily: 'var(--mono)' }}
            >
              <option value="90">90 Days (Strict NDPR/GDPR)</option>
              <option value="365">365 Days (Standard 1 Year)</option>
              <option value="indefinite">Indefinite Retention</option>
            </select>
          </div>

          <button onClick={handleSavePreferences} style={{ background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            Save Retention Policy
          </button>
        </div>
      )}
    </div>
  );
};