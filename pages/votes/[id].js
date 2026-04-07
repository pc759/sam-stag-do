import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import styles from '../../styles/Votes.module.css';

function CandidateAvatar({ name, photoUrl }) {
  const [imgOk, setImgOk] = useState(true);
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

  if (photoUrl && imgOk) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={styles.choiceAvatarImg}
        onError={() => setImgOk(false)}
      />
    );
  }

  return (
    <span className={styles.choiceAvatarFallback} aria-hidden>
      {initial}
    </span>
  );
}

export default function VoteDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [vote, setVote] = useState(null);
  const [choice, setChoice] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const authRes = await fetch('/api/check-auth');
      if (authRes.status === 401) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      setUser(authData.user);
      setIsAuthenticated(true);

      const res = await fetch(`/api/votes/${id}`);
      if (!res.ok) {
        router.push('/votes');
        return;
      }
      const data = await res.json();
      setVote(data);
      setChoice(data.myChoice ?? null);
      setIsLoading(false);
    };

    load();
  }, [id, router]);

  const refreshVote = async () => {
    if (!id) return;
    const res = await fetch(`/api/votes/${id}`);
    if (res.ok) {
      const data = await res.json();
      setVote(data);
      setChoice(data.myChoice ?? null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!choice || !id) return;
    setSaving(true);
    setStatusMsg('');
    const res = await fetch(`/api/votes/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chosenUserId: choice })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatusMsg('Vote saved. You can change it until voting closes.');
      await refreshVote();
    } else if (data.code === 'cannot_vote_murdered') {
      setStatusMsg('You cannot vote in this round.');
    } else {
      setStatusMsg(data.error || 'Could not save vote.');
    }
    setSaving(false);
  };

  if (isLoading || !vote) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const pendingCopy =
    vote.viewerPendingReason === 'murdered'
      ? "You're out of this vote — sit tight until it closes to see the result."
      : vote.viewerPendingReason === 'not_participant'
        ? "You're not in this voting round. You'll see the outcome once it closes."
        : 'This vote is not open yet.';

  const showPending = vote.status === 'open' && vote.viewerVoteUiState === 'pending_results';
  const showForm = vote.status === 'open' && vote.viewerVoteUiState === 'can_vote';
  const showResults = vote.viewerVoteUiState === 'show_results';

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <Link href="/votes" className={styles.back}>
          ← All votes
        </Link>
        <h1>{vote.title || `Vote #${vote.id}`}</h1>
        <p className={styles.cardMeta}>
          {vote.status === 'open' ? (
            <span className={styles.statusOpen}>Voting open</span>
          ) : (
            <span className={styles.statusClosed}>Closed</span>
          )}
        </p>

        {showPending ? (
          <div className={styles.pendingPanel}>
            <h2>Waiting on results</h2>
            <p>{pendingCopy}</p>
          </div>
        ) : null}

        {showForm ? (
          <form className={styles.voteFormPanel} onSubmit={submit}>
            <p className={styles.voteFormIntro}>Your vote is private. You can change it until the host closes voting.</p>
            <div className={styles.candidates} role="radiogroup" aria-label="Vote for">
              {vote.candidates.map((c) => (
                <label
                  key={c.id}
                  className={`${styles.choice} ${Number(choice) === Number(c.id) ? styles.choiceSelected : ''}`}
                >
                  <input
                    type="radio"
                    name="vote"
                    className={styles.choiceRadio}
                    value={c.id}
                    checked={Number(choice) === Number(c.id)}
                    onChange={() => setChoice(c.id)}
                  />
                  <span className={styles.choiceVisual}>
                    <CandidateAvatar name={c.name} photoUrl={c.photoUrl} />
                    <span className={styles.choiceName}>{c.name}</span>
                  </span>
                </label>
              ))}
            </div>
            <button type="submit" className={styles.submitBtn} disabled={!choice || saving}>
              {saving ? 'Saving…' : 'Save vote'}
            </button>
            {statusMsg ? <p className={styles.myVote}>{statusMsg}</p> : null}
            {vote.myChoice != null ? (
              <p className={styles.myVote}>
                Current pick: {vote.candidates.find((c) => Number(c.id) === Number(vote.myChoice))?.name || '—'}
              </p>
            ) : null}
          </form>
        ) : null}

        {showResults && vote.results ? (
          <div className={styles.results}>
            <h2>Results</h2>
            {vote.results.map((r) => (
              <div key={r.userId} className={styles.resultRow}>
                <span>{r.name}</span>
                <strong>{r.count}</strong>
              </div>
            ))}
            {vote.myChoice != null ? (
              <p className={styles.myVote}>
                You voted for:{' '}
                {vote.candidates.find((c) => Number(c.id) === Number(vote.myChoice))?.name || '—'}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
