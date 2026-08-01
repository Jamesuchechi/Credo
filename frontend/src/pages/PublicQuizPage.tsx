import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, XCircle, HelpCircle, Share2, RefreshCw, Trophy, ArrowRight } from 'lucide-react';

export interface QuizQuestion {
  quiz_item_id: string;
  claim_text: string;
  difficulty: string;
  options: string[];
  community_times_played: number;
}

export interface QuizAnswerResult {
  quiz_item_id: string;
  user_guess: string;
  correct_verdict: string;
  is_correct: boolean;
  explanation_summary: string;
  community_accuracy_percent: number;
  times_played: number;
}

export const PublicQuizPage: React.FC = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<QuizAnswerResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  useEffect(() => {
    fetchQuestions();
  }, [selectedDifficulty]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const url = selectedDifficulty
        ? `/api/v1/quiz/items?count=5&difficulty=${selectedDifficulty}`
        : `/api/v1/quiz/items?count=5`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
        setCurrentIndex(0);
        setAnswerResult(null);
      }
    } catch (e) {
      console.error('Failed to fetch quiz questions', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async (guess: string) => {
    if (!questions[currentIndex] || answerResult) return;
    const currentQ = questions[currentIndex];

    try {
      const res = await fetch('/api/v1/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_item_id: currentQ.quiz_item_id,
          user_guess: guess,
        }),
      });

      if (res.ok) {
        const data: QuizAnswerResult = await res.json();
        setAnswerResult(data);
        setAnsweredCount((prev) => prev + 1);
        if (data.is_correct) {
          setScore((prev) => prev + 1);
        }
      }
    } catch (e) {
      console.error('Error submitting answer', e);
    }
  };

  const handleNext = () => {
    setAnswerResult(null);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Re-fetch next batch
      fetchQuestions();
    }
  };

  const currentQ = questions[currentIndex];
  const totalPercentage = answeredCount > 0 ? Math.round((score / answeredCount) * 100) : 0;
  const shareText = `🎯 I scored ${score}/${answeredCount} (${totalPercentage}%) on the Credo Misinformation Literacy Challenge! Test your fact-checking skills: https://credo.app/quiz`;

  const copyShareText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '30px 20px 80px 20px' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', background: 'rgba(224,185,78,0.12)', border: '1px solid var(--brass)', color: 'var(--brass)', fontSize: '12px', fontFamily: 'var(--mono)', fontWeight: 700, marginBottom: '12px' }}>
          <Trophy size={15} /> PUBLIC LITERACY GAME
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: '32px', fontWeight: 600, margin: '0 0 10px 0', color: 'var(--text)' }}>
          Can You Spot Misinformation?
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-dim)', margin: 0, maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
          Test your critical thinking against real anonymized claim statements audited by Credo's AI verification engine.
        </p>
      </div>

      {/* Tally Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
            Score: <strong style={{ color: 'var(--verified)', fontSize: '16px' }}>{score}</strong> / {answeredCount}
          </div>
          {answeredCount > 0 && (
            <div style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--brass)', background: 'var(--surface-2)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
              Accuracy: {totalPercentage}%
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {['all', 'easy', 'medium', 'hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff === 'all' ? null : diff)}
              style={{
                background: (selectedDifficulty === diff || (diff === 'all' && !selectedDifficulty)) ? 'var(--brass)' : 'var(--surface-2)',
                color: (selectedDifficulty === diff || (diff === 'all' && !selectedDifficulty)) ? '#0b0e14' : 'var(--text-dim)',
                border: '1px solid var(--line)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--mono)',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <RefreshCw size={30} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ fontFamily: 'var(--mono)', fontSize: '14px' }}>Loading public claims pool...</p>
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--line)' }}>
          <HelpCircle size={36} color="var(--brass)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>No Quiz Questions Available Yet</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: 0 }}>
            Curated quiz questions will appear as admins review analyzed claims.
          </p>
        </div>
      )}

      {!loading && currentQ && (
        <div className="glass-card" style={{ padding: '30px', background: 'var(--surface-2)', borderRadius: '18px', border: '1px solid var(--line-strong)', boxShadow: '0 15px 35px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              QUESTION {currentIndex + 1} OF {questions.length} • {currentQ.difficulty.toUpperCase()}
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
              {currentQ.community_times_played} players answered
            </span>
          </div>

          <h3 style={{ fontSize: '20px', fontFamily: 'var(--serif)', fontWeight: 500, lineHeight: 1.4, margin: '0 0 28px 0', color: 'var(--text)' }}>
            "{currentQ.claim_text}"
          </h3>

          {/* Option Buttons */}
          {!answerResult ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <button
                onClick={() => handleGuess('supported')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid var(--verified)',
                  color: 'var(--verified)',
                  fontSize: '14px',
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🟢 SUPPORTED (TRUE)
              </button>

              <button
                onClick={() => handleGuess('contradicted')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid var(--disputed)',
                  color: 'var(--disputed)',
                  fontSize: '14px',
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔴 CONTRADICTED (FALSE)
              </button>

              <button
                onClick={() => handleGuess('unverified')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(224, 185, 78, 0.08)',
                  border: '1px solid var(--brass)',
                  color: 'var(--brass)',
                  fontSize: '14px',
                  fontFamily: 'var(--mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🟡 UNVERIFIED / MISLEADING
              </button>
            </div>
          ) : (
            /* Verdict Feedback Card */
            <div
              style={{
                padding: '24px',
                borderRadius: '14px',
                background: answerResult.is_correct ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${answerResult.is_correct ? 'var(--verified)' : 'var(--disputed)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {answerResult.is_correct ? (
                    <CheckCircle2 size={24} color="var(--verified)" />
                  ) : (
                    <XCircle size={24} color="var(--disputed)" />
                  )}
                  <span style={{ fontSize: '16px', fontFamily: 'var(--mono)', fontWeight: 700, color: answerResult.is_correct ? 'var(--verified)' : 'var(--disputed)' }}>
                    {answerResult.is_correct ? 'CORRECT GUESS!' : 'INCORRECT'}
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                  Correct Verdict: <strong>{answerResult.correct_verdict.toUpperCase()}</strong>
                </span>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>
                <strong>Credo Verdict Explanation:</strong> {answerResult.explanation_summary}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                  📊 {answerResult.community_accuracy_percent}% of players guessed correctly
                </span>

                <button
                  onClick={handleNext}
                  style={{
                    background: 'var(--brass)',
                    color: '#0b0e14',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'var(--mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Next Question <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shareable Score Growth Card */}
      {answeredCount >= 3 && (
        <div style={{ marginTop: '36px', padding: '24px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--brass)', textAlign: 'center' }}>
          <Award size={32} color="var(--brass)" style={{ margin: '0 auto 10px auto' }} />
          <h3 style={{ fontSize: '18px', margin: '0 0 6px 0', color: 'var(--text)' }}>
            Share Your Misinformation Spotting Score!
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', marginBottom: '18px' }}>
            Invite friends to test their media literacy skills against real Credo verification audits.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={copyShareText}
              style={{
                background: 'var(--brass)',
                color: '#0b0e14',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'var(--mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Share2 size={16} />
              {copiedShare ? 'Copied Share Link!' : 'Copy Share Result'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
