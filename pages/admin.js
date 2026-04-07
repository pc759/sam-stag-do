import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import ColorField from '../components/ColorField';
import { useBranding } from '../contexts/BrandingContext';
import { defaultContent } from '../lib/siteContent';
import styles from '../styles/Admin.module.css';

const KittyQuill = dynamic(() => import('../components/KittyQuill'), { ssr: false });
const TABS = [
{ id: 'look', label: 'Look & feel' },
{ id: 'content', label: 'Content' },
{ id: 'people', label: 'People & tags' },
{ id: 'traitors', label: 'Traitors / votes' },
{ id: 'expenses', label: 'Expenses' },
{ id: 'stories', label: 'Stories' },
{ id: 'account', label: 'Account' }
];

const TAB_IDS = new Set(TABS.map((t) => t.id));

export default function Admin() {
const router = useRouter();
const { refreshBranding } = useBranding();
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [user, setUser] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [content, setContent] = useState({ ...defaultContent });
const [stories, setStories] = useState([]);
const [users, setUsers] = useState([]);
const [tags, setTags] = useState([]);
const [status, setStatus] = useState('');
const [isSaving, setIsSaving] = useState(false);
const [uploadBusy, setUploadBusy] = useState(false);
const [newUser, setNewUser] = useState({ name: '', mobile: '', password: '' });
const [newTag, setNewTag] = useState({
name: '',
icon: '🏷️',
badgeColor: '#374151',
hiddenFromAttendees: false,
photoOverlay: '',
traitorChannel: false
});
const [adminVotes, setAdminVotes] = useState([]);
const [adminExpenses, setAdminExpenses] = useState([]);
const [adminBalances, setAdminBalances] = useState([]);
const [adminPayments, setAdminPayments] = useState([]);
const [expenseForm, setExpenseForm] = useState({
title: '',
notes: '',
expenseDate: '',
splits: [{ userId: '', amountPence: '' }]
});
const [editingExpenseId, setEditingExpenseId] = useState(null);
const [paymentForm, setPaymentForm] = useState({
userId: '',
expenseId: '',
amountPence: '',
paymentDate: '',
notes: ''
});
const [newVoteTitle, setNewVoteTitle] = useState('');
const [voteParticipantIds, setVoteParticipantIds] = useState(new Set());
const [voteCandidateIds, setVoteCandidateIds] = useState(new Set());
const [showCreateVote, setShowCreateVote] = useState(false);
const [adminPassword, setAdminPassword] = useState('');
const [activeTab, setActiveTab] = useState('look');

useEffect(() => {
if (!router.isReady) return;
const t = router.query.tab;
if (typeof t === 'string' && TAB_IDS.has(t)) {
setActiveTab(t);
}
}, [router.isReady, router.query.tab]);

const selectTab = (id) => {
setActiveTab(id);
router.replace({ pathname: '/admin', query: { ...router.query, tab: id } }, undefined, {
shallow: true
});
};

const onTabKeyDown = (e, index) => {
if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
e.preventDefault();
const next =
e.key === 'ArrowRight'
? (index + 1) % TABS.length
: (index - 1 + TABS.length) % TABS.length;
selectTab(TABS[next].id);
const el = document.getElementById(`admin-tab-${TABS[next].id}`);
el?.focus();
};

const fetchContent = async () => {
const res = await fetch('/api/site-content');
const data = await res.json();
setContent({ ...defaultContent, ...data });
};

const fetchStories = async () => {
const res = await fetch('/api/admin/stories');
const data = await res.json();
setStories(data);
};

const fetchUsers = async () => {
const [usersRes, rosterRes] = await Promise.all([fetch('/api/admin/users'), fetch('/api/roster')]);
const data = await usersRes.json();
const roster = rosterRes.ok ? await rosterRes.json() : [];
setUsers(
data.map((entry) => {
const rosterUser = roster.find((u) => u.id === entry.id);
return { ...entry, tags: rosterUser?.tags || [] };
})
);
};

const fetchTags = async () => {
const res = await fetch('/api/admin/tags');
const data = await res.json();
setTags(data);
};

const fetchAdminVotes = async () => {
const res = await fetch('/api/admin/votes');
if (!res.ok) return;
setAdminVotes(await res.json());
};

const fetchAdminExpenses = async () => {
const res = await fetch('/api/admin/expenses');
if (!res.ok) return;
const data = await res.json();
setAdminExpenses(data.expenses || []);
setAdminBalances(data.balances || []);
};

const fetchAdminPayments = async () => {
const res = await fetch('/api/admin/payments');
if (!res.ok) return;
setAdminPayments(await res.json());
};

useEffect(() => {
const init = async () => {
try {
const authRes = await fetch('/api/check-auth', { method: 'GET' });
if (authRes.status === 401) {
router.push('/login');
return;
}
const authData = await authRes.json();
if (!authData.user?.isAdmin) {
router.push('/');
return;
}

setIsAuthenticated(true);
setUser(authData.user);
await Promise.all([fetchContent(), fetchStories(), fetchUsers(), fetchTags()]);
} finally {
setIsLoading(false);
}
};
init();
}, [router]);
const addSplitRow = () => {
setExpenseForm((prev) => ({ ...prev, splits: [...prev.splits, { userId: '', amountPence: '' }] }));
};
const updateSplitRow = (index, key, value) => {
setExpenseForm((prev) => {
const nextSplits = prev.splits.map((split, splitIndex) =>
splitIndex === index ? { ...split, [key]: value } : split
);
return { ...prev, splits: nextSplits };
});
};

const removeSplitRow = (index) => {
setExpenseForm((prev) => {
if (prev.splits.length <= 1) {
return prev;
}
return { ...prev, splits: prev.splits.filter((_, splitIndex) => splitIndex !== index) };
});
};

const resetExpenseForm = () => {
setExpenseForm({
title: '',
notes: '',
expenseDate: '',
splits: [{ userId: '', amountPence: '' }]
});
setEditingExpenseId(null);
};

const startEditExpense = (expense) => {
setEditingExpenseId(expense.id);
setExpenseForm({
title: expense.title || '',
notes: expense.notes || '',
expenseDate: expense.expense_date ? String(expense.expense_date).slice(0, 10) : '',
splits:
expense.splits?.map((split) => ({
userId: String(split.userId ?? split.user_id ?? ''),
amountPence: String(split.amountPence ?? split.amount_pence ?? '')
})) || [{ userId: '', amountPence: '' }]
});
};

const handleSaveExpense = async (e) => {
e.preventDefault();
setStatus('');

const payload = {
id: editingExpenseId,
title: expenseForm.title,
notes: expenseForm.notes,
expenseDate: expenseForm.expenseDate || null,
splits: expenseForm.splits.map((split) => ({
userId: Number(split.userId),
amountPence: Number(split.amountPence)
}))
};

const isEdit = Boolean(editingExpenseId);
const res = await fetch('/api/admin/expenses', {
method: isEdit ? 'PATCH' : 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});

if (res.ok) {
setStatus(isEdit ? 'Expense updated.' : 'Expense created.');
resetExpenseForm();
await Promise.all([fetchAdminExpenses(), fetchAdminPayments()]);
} else {
const data = await res.json().catch(() => ({}));
setStatus(data.error || 'Failed to save expense.');
}
};

const handleDeleteExpense = async (expenseId) => {
if (!window.confirm('Delete this expense? This is a soft delete.')) {
return;
}

const res = await fetch(`/api/admin/expenses?id=${expenseId}`, { method: 'DELETE' });
if (res.ok) {
setStatus('Expense deleted.');
if (editingExpenseId === expenseId) {
resetExpenseForm();
}
await Promise.all([fetchAdminExpenses(), fetchAdminPayments()]);
} else {
setStatus('Failed to delete expense.');
}
};

const handleCreatePayment = async (e) => {
e.preventDefault();
setStatus('');
const payload = {
userId: Number(paymentForm.userId),
expenseId: paymentForm.expenseId ? Number(paymentForm.expenseId) : null,
amountPence: Number(paymentForm.amountPence),
paymentDate: paymentForm.paymentDate || null,
notes: paymentForm.notes
};

const res = await fetch('/api/admin/payments', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});

if (res.ok) {
setStatus('Payment added.');
setPaymentForm({ userId: '', expenseId: '', amountPence: '', paymentDate: '', notes: '' });
await Promise.all([fetchAdminExpenses(), fetchAdminPayments()]);
} else {
const data = await res.json().catch(() => ({}));
setStatus(data.error || 'Failed to add payment.');
}
};

const handleDeletePayment = async (paymentId) => {
if (!window.confirm('Delete this payment? This is a soft delete.')) {
return;
}

const res = await fetch(`/api/admin/payments?id=${paymentId}`, { method: 'DELETE' });
if (res.ok) {
setStatus('Payment deleted.');
await Promise.all([fetchAdminExpenses(), fetchAdminPayments()]);
} else {
setStatus('Failed to delete payment.');
}
};
  const patchTag = async (tagId, partial) => {
    const res = await fetch('/api/admin/tags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tagId, ...partial })
    });
    if (res.ok) {
      fetchTags();
      fetchRosterUsers();
      setStatus('Tag updated.');
    }
  };

  const handleSaveContent = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus('');

    try {
      const res = await fetch('/api/site-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      setStatus('Saved.');
      await refreshBranding();
    } catch (err) {
      setStatus('Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadBusy(true);
    setStatus('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || 'Upload failed.');
        return;
      }
      if (data.url) {
        let next;
        setContent((c) => {
          next = { ...c, siteLogoUrl: data.url };
          return next;
        });
        const saveRes = await fetch('/api/site-content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next)
        });
        if (saveRes.ok) {
          await refreshBranding();
          setStatus('Image uploaded and saved.');
        } else {
          setStatus('Uploaded; save Look & feel manually to persist the URL.');
        }
      }
    } catch {
      setStatus('Upload failed.');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleDeleteStory = async (id) => {
    const ok = window.confirm('Delete this story?');
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/stories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStories((prev) => prev.filter((story) => story.id !== id));
      }
    } catch (err) {
      // no-op
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setStatus('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (res.ok) {
      setStatus('User added.');
      setNewUser({ name: '', mobile: '', password: '' });
      fetchUsers();
    } else {
      setStatus('Failed to add user. Mobile may already exist.');
    }
  };

  const handleResetPassword = async (userId) => {
    const password = window.prompt('Set new password');
    if (!password) return;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });
    if (res.ok) {
      setStatus('Password updated.');
    } else {
      setStatus('Failed to update password.');
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTag,
        photoOverlay: newTag.photoOverlay === 'murdered' ? 'murdered' : null
      })
    });
    if (res.ok) {
      setNewTag({
        name: '',
        icon: '🏷️',
        badgeColor: '#374151',
        hiddenFromAttendees: false,
        photoOverlay: '',
        traitorChannel: false
      });
      fetchTags();
      setStatus('Tag created.');
    } else {
      setStatus('Failed to create tag.');
    }
  };

  const toggleVoteParticipant = (userId) => {
    setVoteParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        setVoteCandidateIds((c) => {
          const cn = new Set(c);
          cn.delete(userId);
          return cn;
        });
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleVoteCandidate = (userId) => {
    if (!voteParticipantIds.has(userId)) {
      return;
    }
    setVoteCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreateVote = async (e) => {
    e.preventDefault();
    const participantIds = [...voteParticipantIds];
    const candidateIds = [...voteCandidateIds].filter((id) => voteParticipantIds.has(id));
    if (!participantIds.length || !candidateIds.length) {
      setStatus('Pick at least one participant and one candidate (candidates must be participants).');
      return;
    }
    const res = await fetch('/api/admin/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newVoteTitle.trim() || 'Vote',
        participantIds,
        candidateIds
      })
    });
    if (res.ok) {
      setNewVoteTitle('');
      setVoteParticipantIds(new Set());
      setVoteCandidateIds(new Set());
      setStatus('Vote created (draft). Open it when ready.');
      fetchAdminVotes();
    } else {
      setStatus('Failed to create vote.');
    }
  };

  const voteAction = async (voteId, action) => {
    const res = await fetch('/api/admin/votes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: voteId, action })
    });
    if (res.ok) {
      fetchAdminVotes();
      setStatus('Vote updated.');
    }
  };
useEffect(() => {
  if (!isAuthenticated || !user?.isAdmin || activeTab !== 'traitors') {
    return;
  }
  fetchAdminVotes();
}, [isAuthenticated, user?.isAdmin, activeTab]);

useEffect(() => {
  if (!isAuthenticated || !user?.isAdmin || activeTab !== 'expenses') {
    return;
  }
  Promise.all([fetchAdminExpenses(), fetchAdminPayments()]);
}, [isAuthenticated, user?.isAdmin, activeTab]);
  const handleSetAdminPassword = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim() || !user?.id) return;
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, password: adminPassword })
    });
    if (res.ok) {
      setStatus('Admin password updated.');
      setAdminPassword('');
    } else {
      setStatus('Failed to update admin password.');
    }
  };

  const handleDeleteTag = async (tagId) => {
    const res = await fetch(`/api/admin/tags?id=${tagId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchTags();
      fetchRosterUsers();
      setStatus('Tag removed.');
    }
  };

  const fetchRosterUsers = async () => {
    const rosterRes = await fetch('/api/roster');
    if (!rosterRes.ok) return;
    const roster = await rosterRes.json();
    setUsers((prev) =>
      prev.map((u) => {
        const rosterUser = roster.find((r) => r.id === u.id);
        return rosterUser ? { ...u, tags: rosterUser.tags } : u;
      })
    );
  };

  const toggleUserTag = async (userId, tagId, enabled) => {
    await fetch('/api/admin/user-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tagId, enabled })
    });
    fetchRosterUsers();
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <h1>Admin CMS</h1>
        <p className={styles.subtitle}>Manage content, attendees, passwords, and gamer-tag badges.</p>

        <div className={styles.tabList} role="tablist" aria-label="Admin sections">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={activeTab === tab.id ? styles.tabActive : styles.tab}
              id={`admin-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`admin-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {status ? <p className={styles.status}>{status}</p> : null}

        <div
          id="admin-panel-look"
          role="tabpanel"
          aria-labelledby="admin-tab-look"
          hidden={activeTab !== 'look'}
        >
          {activeTab === 'look' && (
            <section className={styles.section}>
              <h2>Look & feel</h2>
              <p className={styles.help}>
                <strong>Page</strong> = text on the gradient (titles, intros). <strong>Cards</strong> = white
                panels. <strong>Chrome</strong> = nav bar + footer. <strong>Accent</strong> = links and primary
                actions. Aim for roughly <strong>4.5:1 contrast</strong> on page text vs the gradient (WCAG
                AA). <strong>Reduced motion</strong> disables fog animation.
              </p>
              <form onSubmit={handleSaveContent} className={styles.form}>
                <fieldset className={styles.fieldset}>
                  <legend>Logo</legend>
                  <label>
                    Upload image (PNG, JPEG, WebP, GIF, SVG — max 5MB)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      disabled={uploadBusy}
                      onChange={handleLogoUpload}
                    />
                  </label>
                  <label>
                    Image URL (optional override or external host)
                    <input
                      value={content.siteLogoUrl}
                      onChange={(e) => setContent({ ...content, siteLogoUrl: e.target.value })}
                      placeholder="/uploads/… or https://…"
                    />
                  </label>
                  {content.siteLogoUrl ? (
                    <div className={styles.logoPreview}>
                      <div className={styles.logoPreviewCircle}>
                        <img src={content.siteLogoUrl} alt="" width={120} height={120} decoding="async" />
                      </div>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => setContent({ ...content, siteLogoUrl: '' })}
                      >
                        Clear logo
                      </button>
                    </div>
                  ) : null}
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Page (gradient background)</legend>
                  <div className={styles.colorGrid}>
                    <ColorField
                      id="theme-gradient-start"
                      label="Gradient start"
                      value={content.themeGradientStart}
                      onChange={(v) => setContent({ ...content, themeGradientStart: v })}
                    />
                    <ColorField
                      id="theme-gradient-end"
                      label="Gradient end"
                      value={content.themeGradientEnd}
                      onChange={(v) => setContent({ ...content, themeGradientEnd: v })}
                    />
                    <ColorField
                      id="theme-page-text"
                      label="Page text"
                      hint="Titles and body copy that sit directly on the gradient."
                      value={content.themePageText}
                      onChange={(v) => setContent({ ...content, themePageText: v })}
                    />
                    <ColorField
                      id="theme-page-text-muted"
                      label="Page text (muted)"
                      hint="Subtitles and secondary lines on the gradient."
                      value={content.themePageTextMuted}
                      onChange={(v) => setContent({ ...content, themePageTextMuted: v })}
                    />
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Cards (light panels)</legend>
                  <div className={styles.colorGrid}>
                    <ColorField
                      id="theme-card-heading"
                      label="Card headings"
                      value={content.themeCardHeading}
                      onChange={(v) => setContent({ ...content, themeCardHeading: v })}
                    />
                    <ColorField
                      id="theme-card-body"
                      label="Card body text"
                      value={content.themeCardBody}
                      onChange={(v) => setContent({ ...content, themeCardBody: v })}
                    />
                    <ColorField
                      id="theme-card-muted"
                      label="Muted / secondary on cards"
                      value={content.themeCardMuted}
                      onChange={(v) => setContent({ ...content, themeCardMuted: v })}
                    />
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Accent</legend>
                  <div className={styles.colorGrid}>
                    <ColorField
                      id="theme-accent"
                      label="Accent"
                      hint="Links on cards and primary actions."
                      value={content.themeAccent}
                      onChange={(v) => setContent({ ...content, themeAccent: v })}
                    />
                    <ColorField
                      id="theme-accent-hover"
                      label="Accent hover"
                      value={content.themeAccentHover}
                      onChange={(v) => setContent({ ...content, themeAccentHover: v })}
                    />
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Top bar and footer</legend>
                  <div className={styles.colorGrid}>
                    <ColorField
                      id="theme-chrome-tint"
                      label="Bar tint"
                      hint="Mixed with transparency for the nav and footer background."
                      value={content.themeChromeTint}
                      onChange={(v) => setContent({ ...content, themeChromeTint: v })}
                    />
                    <ColorField
                      id="theme-chrome-text"
                      label="Nav and footer text"
                      hint="Single colour for nav links and the footer line."
                      value={content.themeChromeText}
                      onChange={(v) => setContent({ ...content, themeChromeText: v })}
                    />
                  </div>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Typography</legend>
                  <label>
                    Font family (CSS stack)
                    <textarea
                      rows={2}
                      value={content.themeFontFamily}
                      onChange={(e) => setContent({ ...content, themeFontFamily: e.target.value })}
                      placeholder="-apple-system, BlinkMacSystemFont, sans-serif"
                    />
                  </label>
                  <p className={styles.help}>
                    Comma-separated font names; use quotes around names with spaces (e.g.{' '}
                    <code>&apos;Segoe UI&apos;</code>). Applies site-wide.
                  </p>
                </fieldset>

                <fieldset className={styles.fieldset}>
                  <legend>Hero fog</legend>
                  <label>
                    Fog enabled
                    <select
                      value={content.heroFogEnabled}
                      onChange={(e) => setContent({ ...content, heroFogEnabled: e.target.value })}
                    >
                      <option value="true">On</option>
                      <option value="false">Off</option>
                    </select>
                  </label>
                  <label>
                    Fog opacity (0–1)
                    <input
                      value={content.heroFogOpacity}
                      onChange={(e) => setContent({ ...content, heroFogOpacity: e.target.value })}
                      inputMode="decimal"
                    />
                  </label>
                  <label>
                    Animation duration (seconds, larger = slower)
                    <input
                      value={content.heroFogSpeedSec}
                      onChange={(e) => setContent({ ...content, heroFogSpeedSec: e.target.value })}
                      inputMode="numeric"
                    />
                  </label>
                  <ColorField
                    id="hero-fog-tint"
                    label="Fog tint"
                    value={content.heroFogTint}
                    onChange={(v) => setContent({ ...content, heroFogTint: v })}
                  />
                </fieldset>

                <button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save look & feel'}
                </button>
              </form>
            </section>
          )}
        </div>

        <div
          id="admin-panel-content"
          role="tabpanel"
          aria-labelledby="admin-tab-content"
          hidden={activeTab !== 'content'}
        >
          {activeTab === 'content' && (
            <section className={styles.section}>
              <h2>Site content</h2>
              <form onSubmit={handleSaveContent} className={styles.form}>
                <label>
                  Home Title
                  <input
                    value={content.homeTitle}
                    onChange={(e) => setContent({ ...content, homeTitle: e.target.value })}
                  />
                </label>
                <label>
                  Home Tagline
                  <input
                    value={content.homeTagline}
                    onChange={(e) => setContent({ ...content, homeTagline: e.target.value })}
                  />
                </label>
                <label>
                  Home About
                  <textarea
                    rows="4"
                    value={content.homeAbout}
                    onChange={(e) => setContent({ ...content, homeAbout: e.target.value })}
                  />
                </label>
                <label>
                  Details - When
                  <input
                    value={content.detailsWhen}
                    onChange={(e) => setContent({ ...content, detailsWhen: e.target.value })}
                  />
                </label>
                <label>
                  Details - When Description
                  <textarea
                    rows="2"
                    value={content.detailsWhenDescription}
                    onChange={(e) => setContent({ ...content, detailsWhenDescription: e.target.value })}
                  />
                </label>
                <label>
                  Details - Where
                  <input
                    value={content.detailsWhere}
                    onChange={(e) => setContent({ ...content, detailsWhere: e.target.value })}
                  />
                </label>
                <label>
                  Details - Where Description
                  <textarea
                    rows="2"
                    value={content.detailsWhereDescription}
                    onChange={(e) =>
                      setContent({ ...content, detailsWhereDescription: e.target.value })
                    }
                  />
                </label>
                <label>
                  Details - Google Map Embed URL
                  <input
                    value={content.detailsWhereMapEmbedUrl}
                    onChange={(e) =>
                      setContent({ ...content, detailsWhereMapEmbedUrl: e.target.value })
                    }
                    placeholder="https://www.google.com/maps/embed?pb=..."
                  />
                </label>
                <label>
                  Details - Google Map Link URL
                  <input
                    value={content.detailsWhereMapLinkUrl}
                    onChange={(e) =>
                      setContent({ ...content, detailsWhereMapLinkUrl: e.target.value })
                    }
                    placeholder="https://maps.google.com/?q=..."
                  />
                </label>
                <label>
                  Details - Accommodation Website URL
                  <input
                    value={content.detailsAccommodationUrl}
                    onChange={(e) =>
                      setContent({ ...content, detailsAccommodationUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </label>
                <label>
                  Details - Who
                  <input
                    value={content.detailsWho}
                    onChange={(e) => setContent({ ...content, detailsWho: e.target.value })}
                  />
                </label>
                <label>
                  Details - Who Description
                  <textarea
                    rows="2"
                    value={content.detailsWhoDescription}
                    onChange={(e) => setContent({ ...content, detailsWhoDescription: e.target.value })}
                  />
                </label>
                <label>
                  Details - Cost
                  <input
                    value={content.detailsCost}
                    onChange={(e) => setContent({ ...content, detailsCost: e.target.value })}
                  />
                </label>
                <label>
                  Details - Cost Description
                  <textarea
                    rows="2"
                    value={content.detailsCostDescription}
                    onChange={(e) => setContent({ ...content, detailsCostDescription: e.target.value })}
                  />
                </label>
                <label>
                  What to Bring (one item per line)
                  <textarea
                    rows="6"
                    value={content.detailsBring}
                    onChange={(e) => setContent({ ...content, detailsBring: e.target.value })}
                  />
                </label>
                <label>
                  Itinerary
                  <textarea
                    rows="5"
                    value={content.detailsItinerary}
                    onChange={(e) => setContent({ ...content, detailsItinerary: e.target.value })}
                  />
                </label>
                <label>
                  Chat Enabled
                  <select
                    value={content.chatEnabled}
                    onChange={(e) => setContent({ ...content, chatEnabled: e.target.value })}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </label>
                <label>
                  Simtheory model (optional)
                  <input
                    value={content.chatModel}
                    onChange={(e) => setContent({ ...content, chatModel: e.target.value })}
                    placeholder="Leave blank unless Simtheory docs require a model id"
                  />
                </label>
                <label>
                  Chat System Instructions
                  <textarea
                    rows="5"
                    value={content.chatSystemPrompt}
                    onChange={(e) => setContent({ ...content, chatSystemPrompt: e.target.value })}
                  />
                </label>
                <fieldset className={styles.fieldset}>
                  <legend>Kitty &amp; prizes (public page)</legend>
                  <p className={styles.help}>
                    Shown on the Kitty page for everyone. Use headings and lists for clarity.
                  </p>
                  <div className={styles.quillWrap}>
                    <KittyQuill
                      value={content.kittyHtml || ''}
                      onChange={(html) => setContent({ ...content, kittyHtml: html })}
                    />
                  </div>
                </fieldset>
                <button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save content'}
                </button>
              </form>
              <p className={styles.help}>
                Simtheory API key is read from server env var <code>SIMTHEORY_API_KEY</code>.
                Optional: override endpoint with <code>SIMTHEORY_CHAT_URL</code> (defaults to
                Cartwright).
              </p>
            </section>
          )}
        </div>

        <div
          id="admin-panel-people"
          role="tabpanel"
          aria-labelledby="admin-tab-people"
          hidden={activeTab !== 'people'}
        >
          {activeTab === 'people' && (
            <>
              <section className={styles.section}>
                <h2>Attendees</h2>
                <p className={styles.help}>
                  <Link href="/roster">Open roster</Link> — view and browse everyone in one place.
                </p>
                <form onSubmit={handleCreateUser} className={styles.form}>
                  <label>
                    Name
                    <input
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Mobile
                    <input
                      value={newUser.mobile}
                      onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                    />
                  </label>
                  <label>
                    Initial Password
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </label>
                  <button type="submit">Add User</button>
                </form>
                <div className={styles.storyList}>
                  {users
                    .filter((u) => !u.isAdmin)
                    .map((u) => (
                      <article key={u.id} className={styles.storyCard}>
                        <header>
                          <strong>{u.name}</strong>
                          <span>{u.mobile || 'No mobile'}</span>
                        </header>
                        <div className={styles.inlineActions}>
                          <button type="button" onClick={() => handleResetPassword(u.id)}>
                            Reset Password
                          </button>
                        </div>
                        <div className={styles.tagRow}>
                          {tags.map((tag) => {
                            const hasTag = (u.tags || []).some((t) => t.id === tag.id);
                            return (
                              <button
                                key={tag.id}
                                className={hasTag ? styles.tagOn : styles.tagOff}
                                onClick={() => toggleUserTag(u.id, tag.id, !hasTag)}
                                type="button"
                              >
                                {tag.icon} {tag.name}
                              </button>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                </div>
              </section>

              <section className={styles.section}>
                <h2>Tag definitions</h2>
                <form onSubmit={handleCreateTag} className={styles.form}>
                  <label>
                    Tag name
                    <input
                      value={newTag.name}
                      onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Icon
                    <input
                      value={newTag.icon}
                      onChange={(e) => setNewTag({ ...newTag, icon: e.target.value })}
                    />
                  </label>
                  <ColorField
                    id="new-tag-badge"
                    label="Badge color"
                    value={newTag.badgeColor}
                    onChange={(v) => setNewTag({ ...newTag, badgeColor: v })}
                  />
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newTag.hiddenFromAttendees}
                      onChange={(e) =>
                        setNewTag({ ...newTag, hiddenFromAttendees: e.target.checked })
                      }
                    />
                    Hidden from roster (traitor / faithful)
                  </label>
                  <label>
                    Photo overlay
                    <select
                      value={newTag.photoOverlay}
                      onChange={(e) => setNewTag({ ...newTag, photoOverlay: e.target.value })}
                    >
                      <option value="">None</option>
                      <option value="murdered">Murdered (grey + red tint)</option>
                    </select>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={newTag.traitorChannel}
                      onChange={(e) => setNewTag({ ...newTag, traitorChannel: e.target.checked })}
                    />
                    Traitors&apos; channel access
                  </label>
                  <button type="submit">Create Tag</button>
                </form>
                <div className={styles.tagDefinitions}>
                  {tags.map((tag) => (
                    <div key={tag.id} className={styles.tagDefinitionCard}>
                      <div className={styles.tagDefinitionHead}>
                        <span
                          className={styles.tagPill}
                          style={{ background: tag.badgeColor }}
                        >
                          {tag.icon} {tag.name}
                        </span>
                        <button type="button" onClick={() => handleDeleteTag(tag.id)}>
                          Delete tag
                        </button>
                      </div>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={!!tag.hiddenFromAttendees}
                          onChange={(e) => patchTag(tag.id, { hiddenFromAttendees: e.target.checked })}
                        />
                        Hidden from roster
                      </label>
                      <label>
                        Photo overlay
                        <select
                          value={tag.photoOverlay === 'murdered' ? 'murdered' : ''}
                          onChange={(e) =>
                            patchTag(tag.id, {
                              photoOverlay: e.target.value === 'murdered' ? 'murdered' : null
                            })
                          }
                        >
                          <option value="">None</option>
                          <option value="murdered">Murdered</option>
                        </select>
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={!!tag.traitorChannel}
                          onChange={(e) => patchTag(tag.id, { traitorChannel: e.target.checked })}
                        />
                        Traitors&apos; channel
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <div
          id="admin-panel-traitors"
          role="tabpanel"
          aria-labelledby="admin-tab-traitors"
          hidden={activeTab !== 'traitors'}
        >
          {activeTab === 'traitors' && (
            <section className={styles.section}>
              <h2>Round votes</h2>
              <p className={styles.help}>
                Create a draft, choose who is in the vote and who can receive votes, then open voting.
                Close when finished so everyone sees totals (not who voted for whom).
              </p>
              <form onSubmit={handleCreateVote} className={styles.form}>
                <label>
                  Title
                  <input
                    value={newVoteTitle}
                    onChange={(e) => setNewVoteTitle(e.target.value)}
                    placeholder="e.g. Banishment round 1"
                  />
                </label>
                <fieldset className={styles.fieldset}>
                  <legend>Participants (can vote)</legend>
                  <div className={styles.voteUserGrid}>
                    {users
                      .filter((u) => !u.isAdmin)
                      .map((u) => (
                        <label key={u.id} className={styles.voteUserCard}>
                          <input
                            type="checkbox"
                            className={styles.voteUserCardInput}
                            checked={voteParticipantIds.has(u.id)}
                            onChange={() => toggleVoteParticipant(u.id)}
                          />
                          <span className={styles.voteUserCardBody}>
                            <span className={styles.voteUserCardName}>{u.name}</span>
                            {(u.tags || []).length > 0 ? (
                              <span className={styles.voteUserCardTags}>
                                {(u.tags || []).map((t) => (
                                  <span
                                    key={t.id}
                                    className={styles.voteTagChip}
                                    style={{ background: t.badgeColor || '#374151' }}
                                    title={t.name}
                                    aria-label={t.name}
                                  >
                                    {t.icon}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className={styles.voteNoTags}>No tags</span>
                            )}
                          </span>
                        </label>
                      ))}
                  </div>
                </fieldset>
                <fieldset className={styles.fieldset}>
                  <legend>Candidates (can receive votes)</legend>
                  <div className={styles.voteUserGrid}>
                    {users
                      .filter((u) => !u.isAdmin && voteParticipantIds.has(u.id))
                      .map((u) => (
                        <label key={u.id} className={styles.voteUserCard}>
                          <input
                            type="checkbox"
                            className={styles.voteUserCardInput}
                            checked={voteCandidateIds.has(u.id)}
                            onChange={() => toggleVoteCandidate(u.id)}
                          />
                          <span className={styles.voteUserCardBody}>
                            <span className={styles.voteUserCardName}>{u.name}</span>
                            {(u.tags || []).length > 0 ? (
                              <span className={styles.voteUserCardTags}>
                                {(u.tags || []).map((t) => (
                                  <span
                                    key={t.id}
                                    className={styles.voteTagChip}
                                    style={{ background: t.badgeColor || '#374151' }}
                                    title={t.name}
                                    aria-label={t.name}
                                  >
                                    {t.icon}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className={styles.voteNoTags}>No tags</span>
                            )}
                          </span>
                        </label>
                      ))}
                  </div>
                </fieldset>
                <button type="submit">Create draft vote</button>
              </form>

              <div className={styles.storyList}>
                {adminVotes.map((v) => (
                  <article key={v.id} className={styles.storyCard}>
                    <header>
                      <strong>{v.title}</strong>
                      <span>{v.status}</span>
                    </header>
                    <p className={styles.help}>
                      {v.participantIds?.length || 0} participants · {v.candidateIds?.length || 0}{' '}
                      candidates
                    </p>
                    <div className={styles.inlineActions}>
                      {v.status === 'draft' ? (
                        <button type="button" onClick={() => voteAction(v.id, 'open')}>
                          Open voting
                        </button>
                      ) : null}
                      {v.status === 'open' ? (
                        <button type="button" onClick={() => voteAction(v.id, 'close')}>
                          Close voting
                        </button>
                      ) : null}
                      <button type="button" onClick={() => voteAction(v.id, 'delete')}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {adminVotes.length === 0 ? <p className={styles.help}>No votes yet.</p> : null}
            </section>
          )}
        </div>

        <div
          id="admin-panel-stories"
          role="tabpanel"
          aria-labelledby="admin-tab-stories"
          hidden={activeTab !== 'stories'}
        >
          {activeTab === 'stories' && (
            <section className={styles.section}>
              <h2>Stories ({stories.length})</h2>
              <div className={styles.storyList}>
                {stories.map((story) => (
                  <article key={story.id} className={styles.storyCard}>
                    <header>
                      <strong>{story.author}</strong>
                      <span>{new Date(story.created_at).toLocaleString()}</span>
                    </header>
                    <p>{story.story}</p>
                    <button type="button" onClick={() => handleDeleteStory(story.id)}>
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <div
          id="admin-panel-account"
          role="tabpanel"
          aria-labelledby="admin-tab-account"
          hidden={activeTab !== 'account'}
        >
          {activeTab === 'account' && (
            <section className={styles.section}>
              <h2>Admin password</h2>
              <form onSubmit={handleSetAdminPassword} className={styles.form}>
                <label>
                  Set new admin password (username `pete`)
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
                <button type="submit">Update Admin Password</button>
              </form>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}
