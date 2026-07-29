import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  Award,
  Calendar,
  CheckCircle2,
  Activity,
  Edit3,
  LogOut,
  Save,
  Globe,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchContentList } from '../api/client';
import { ContentListResponse } from '../types';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState('OSINT Investigator & Fact-Checker focusing on West African regional news & claim verification.');
  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [userSubmissions, setUserSubmissions] = useState<ContentListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchContentList(1, 10)
      .then((d) => {
        if (!cancelled) {
          setUserSubmissions(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'CR';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setSaveMessage('Profile information saved successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: '1150px', margin: '0 auto' }}>
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
              User Profile & Contributor Identity
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              View your reputation score, investigator level, and personal contribution metrics across Credo.
            </p>
          </div>
        </div>
      </header>

      {saveMessage && (
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
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Profile Hero Banner */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brass), #8a6a2e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mono)',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--ink)',
              boxShadow: '0 0 25px rgba(217,169,78,0.3)',
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: '24px', fontWeight: 600, margin: 0 }}>
                {fullName || user?.full_name || 'Credo Researcher'}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '100px',
                  background: 'var(--verified-dim)',
                  color: 'var(--verified)',
                  border: '1px solid var(--verified)',
                  textTransform: 'uppercase',
                }}
              >
                Verified Investigator
              </span>
            </div>

            <div style={{ fontSize: '13.5px', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} color="var(--brass)" /> {email || user?.email}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-faint)', margin: 0, maxWidth: '520px', lineHeight: 1.5 }}>
              {bio}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Edit3 size={15} /> {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button
            onClick={logout}
            style={{
              background: 'var(--disputed-dim)',
              color: 'var(--disputed)',
              border: '1px solid var(--disputed)',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* Contributor Metrics & Reputation Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(217,169,78,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Reputation Level
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brass)', marginTop: '2px' }}>
              Tier 3 Senior
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Analyses Submitted
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {userSubmissions?.total || 0} Items
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--verified-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} color="var(--verified)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Verification Accuracy
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--verified)', marginTop: '2px' }}>
              98.4% Rate
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={22} color="var(--brass)" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Member Since
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
              July 2026
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form Panel */}
      {isEditing && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '28px', marginBottom: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 20px 0' }}>
            Update Profile Information
          </h3>
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>Full Display Name</label>
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>Investigator Bio & Affiliation</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setIsEditing(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '10px 18px', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" style={{ background: 'var(--brass)', color: 'var(--ink)', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={16} /> Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Submission Audit Stream */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>
          Your Recent Claims & Submissions
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
            <Sparkles size={20} color="var(--brass)" style={{ animation: 'spin 2s linear infinite', marginBottom: '8px' }} />
            <div>Loading submission records...</div>
          </div>
        ) : !userSubmissions || userSubmissions.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface-2)', borderRadius: '12px' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>No submissions found for this profile.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {userSubmissions.items.map((item) => {
              const displayTitle = item.title || (item.raw_payload ? (item.raw_payload.length > 70 ? item.raw_payload.slice(0, 70) + '...' : item.raw_payload) : 'Analysis Item');
              const isSupp = item.verdict === 'verified';
              const isDis = item.verdict === 'disputed';
              const vColor = isSupp ? 'var(--verified)' : isDis ? 'var(--disputed)' : 'var(--brass)';

              return (
                <div
                  key={item.id}
                  onClick={() => navigate('/dashboard/history')}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--surface-2)',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    {item.source_domain ? <Globe size={18} color="var(--brass)" /> : <FileText size={18} color="var(--brass)" />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        "{displayTitle}"
                      </div>
                      <div style={{ fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--text-faint)' }}>
                        {item.claims_count} claim{item.claims_count !== 1 ? 's' : ''} extracted · Submitted {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {item.verdict && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: isSupp ? 'var(--verified-dim)' : isDis ? 'var(--disputed-dim)' : 'rgba(217,169,78,0.14)',
                        color: vColor,
                      }}
                    >
                      {item.verdict}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
