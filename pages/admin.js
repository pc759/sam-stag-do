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
{ id: 'pages', label: 'Pages' },
{ id: 'navigation', label: 'Navigation' },
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
splits: [{ userId: '', amount: '' }]
});
const [editingExpenseId, setEditingExpenseId] = useState(null);
const [paymentForm, setPaymentForm] = useState({
userId: '',
expenseId: '',
amount: '',
paymentDate: '',
notes: ''
});
const [adminPages, setAdminPages] = useState([]);
const [editingPageId, setEditingPageId] = useState(null);
const [pageForm, setPageForm] = useState({ title: '', slug: '', icon: '', subtitle: '', body: '', showInNav: true, isPublished: false, sortOrder: 0, showOnHomepage: false, homepageOrder: 0, gridSpan: 4 });
const [newVoteTitle, setNewVoteTitle] = useState('');
const [voteParticipantIds, setVoteParticipantIds] = useState(new Set());
const [voteCandidateIds, setVoteCandidateIds] = useState(new Set());
const [showCreateVote, setShowCreateVote] = useState(false);
const [adminPassword, setAdminPassword] = useState('');
const [navItems, setNavItems] = useState([]);
const [editingNavId, setEditingNavId] = useState(null);
const [navForm, setNavForm] = useState({ label: '', pageId: '', url: '', parentId: '', sortOrder: 0, isVisible: true, openInNewTab: false });
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

const fetchAdminPages = async () => {
const res = await fetch('/api/admin/pages');
if (!res.ok) return;
setAdminPages(await res.json());
};

const handleSavePage = async (e) => {
e.preventDefault();
setStatus('');
const payload = { ...pageForm };
if (editingPageId) payload.id = editingPageId;
const res = await fetch('/api/admin/pages', {
method: editingPageId ? 'PUT' : 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});
if (res.ok) {
setStatus(editingPageId ? 'Page updated.' : 'Page created.');
setPageForm({ title: '', slug: '', icon: '', subtitle: '', body: '', showInNav: true, isPublished: false, sortOrder: 0 });
setEditingPageId(null);
fetchAdminPages();
} else {
const data = await res.json().catch(() => ({}));
setStatus(data.error || 'Failed to save page.');
}
};

const handleEditPage = (page) => {
setEditingPageId(page.id);
setPageForm({
title: page.title || '',
slug: page.slug || '',
icon: page.icon || '',
subtitle: page.subtitle || '',
body: page.body || '',
showInNav: !!page.showInNav,
isPublished: !!page.isPublished,
sortOrder: page.sortOrder || 0,
showOnHomepage: !!page.showOnHomepage,
homepageOrder: page.homepageOrder || 0,
gridSpan: page.gridSpan || 4
});
setTimeout(() => { const el = document.getElementById('admin-panel-pages'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100);
};

const handleDeletePage = async (pageId) => {
if (!window.confirm('Delete this page?')) return;
const res = await fetch(`/api/admin/pages?id=${pageId}`, { method: 'DELETE' });
if (res.ok) {
setStatus('Page deleted.');
if (editingPageId === pageId) {
setPageForm({ title: '', slug: '', icon: '', subtitle: '', body: '', showInNav: true, isPublished: false, sortOrder: 0 });
setEditingPageId(null);
}
fetchAdminPages();
} else {
setStatus('Failed to delete page.');
}
};

const fetchNavItems = async () => {
const res = await fetch('/api/admin/navigation');
if (!res.ok) return;
setNavItems(await res.json());
};

const handleSaveNavItem = async (e) => {
e.preventDefault();
setStatus('');
const payload = {
...navForm,
pageId: navForm.pageId ? Number(navForm.pageId) : null,
parentId: navForm.parentId ? Number(navForm.parentId) : null,
sortOrder: Number(navForm.sortOrder) || 0
};
if (editingNavId) payload.id = editingNavId;
const res = await fetch('/api/admin/navigation', {
method: editingNavId ? 'PUT' : 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
});
if (res.ok) {
setStatus(editingNavId ? 'Nav item updated.' : 'Nav item created.');
setNavForm({ label: '', pageId: '', url: '', parentId: '', sortOrder: 0, isVisible: true, openInNewTab: false });
setEditingNavId(null);
fetchNavItems();
} else {
const data = await res.json().catch(() => ({}));
setStatus(data.error || 'Failed to save nav item.');
}
};

const handleEditNavItem = (item) => {
setEditingNavId(item.id);
setNavForm({
label: item.label || '',
pageId: item.pageId ? String(item.pageId) : '',
url: item.url || '',
parentId: item.parentId ? String(item.parentId) : '',
sortOrder: item.sortOrder || 0,
isVisible: item.isVisible !== false,
openInNewTab: !!item.openInNewTab
});
};

const handleDeleteNavItem = async (id) => {
if (!window.confirm('Delete this nav item? Children will also be deleted.')) return;
const res = await fetch(`/api/admin/navigation?id=${id}`, { method: 'DELETE' });
if (res.ok) {
setStatus('Nav item deleted.');
if (editingNavId === id) {
setNavForm({ label: '', pageId: '', url: '', parentId: '', sortOrder: 0, isVisible: true, openInNewTab: false });
setEditingNavId(null);
}
fetchNavItems();
} else {
setStatus('Failed to delete nav item.');
}
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
setExpenseForm((prev) => ({ ...prev, splits: [...prev.splits, { userId: '', amount: '' }] }));
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
splits: [{ userId: '', amount: '' }]
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
amount: String(((split.amountPence ?? split.amount_pence ?? 0) / 100).toFixed(2))
})) || [{ userId: '', amount: '' }]
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
amountPence: Math.round(Number(split.amount) * 100)
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
amountPence: Math.round(Number(paymentForm.amount) * 100),
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
setPaymentForm({ userId: '', expenseId: '', amount: '', paymentDate: '', notes: '' });
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
  if (!isAuthenticated || !user?.isAdmin || activeTab !== 'pages') {
    return;
  }
  fetchAdminPages();
}, [isAuthenticated, user?.isAdmin, activeTab]);
useEffect(() => {
  if (!isAuthenticated || !user?.isAdmin || activeTab !== 'expenses') {
    return;
  }
  Promise.all([fetchAdminExpenses(), fetchAdminPayments()]);
}, [isAuthenticated, user?.isAdmin, activeTab]);
useEffect(() => {
  if (!isAuthenticated || !user?.isAdmin || activeTab !== 'navigation') return;
  fetchNavItems();
  fetchAdminPages();
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
                  Stagony Aunt model (optional)
                  <input
                    value={content.chatModel}
                    onChange={(e) => setContent({ ...content, chatModel: e.target.value })}
                    placeholder="Leave blank unless docs require a specific model id"
                  />
                </label>
                <label>
                  Stagony Aunt System Prompt
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
                Stagony Aunt API key is read from server env var <code>SIMTHEORY_API_KEY</code>.
                Optional: override endpoint with <code>SIMTHEORY_CHAT_URL</code> (defaults to
                Cartwright).
              </p>
            </section>
          )}
        </div>

        <div
          id="admin-panel-pages"
          role="tabpanel"
          aria-labelledby="admin-tab-pages"
          hidden={activeTab !== 'pages'}
        >
          {activeTab === 'pages' && (
            <>
              <section className={styles.section}>
                <h2>{editingPageId ? 'Edit Page' : 'Create Page'}</h2>
                <form onSubmit={handleSavePage} className={styles.form}>
                  <label>Title <input value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })} required /></label>
                  <label>Slug <input value={pageForm.slug} onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })} placeholder="auto-generated from title" /></label>
                  <label>Icon (emoji) <input value={pageForm.icon} onChange={(e) => setPageForm({ ...pageForm, icon: e.target.value })} placeholder="e.g. \uD83C\uDFD5\uFE0F" /></label>
                  <label>Subtitle <input value={pageForm.subtitle} onChange={(e) => setPageForm({ ...pageForm, subtitle: e.target.value })} /></label>
                  <label>Sort order <input type="number" value={pageForm.sortOrder} onChange={(e) => setPageForm({ ...pageForm, sortOrder: Number(e.target.value) })} /></label>
                  <label>Grid span <select value={pageForm.gridSpan} onChange={(e) => setPageForm({ ...pageForm, gridSpan: Number(e.target.value) })}><option value={3}>3 (quarter)</option><option value={4}>4 (third)</option><option value={6}>6 (half)</option><option value={12}>12 (full width)</option></select></label>
                  <label>Homepage order <input type="number" value={pageForm.homepageOrder} onChange={(e) => setPageForm({ ...pageForm, homepageOrder: Number(e.target.value) })} /></label>
                  <label className={styles.checkboxLabel}><input type="checkbox" checked={pageForm.showOnHomepage} onChange={(e) => setPageForm({ ...pageForm, showOnHomepage: e.target.checked })} /> Show on homepage</label>
                  <label className={styles.checkboxLabel}><input type="checkbox" checked={pageForm.showInNav} onChange={(e) => setPageForm({ ...pageForm, showInNav: e.target.checked })} /> Show in navigation</label>
                  <label className={styles.checkboxLabel}><input type="checkbox" checked={pageForm.isPublished} onChange={(e) => setPageForm({ ...pageForm, isPublished: e.target.checked })} /> Published</label>
                  <fieldset className={styles.fieldset}>
                    <legend>Page body</legend>
                    <div className={styles.quillWrap}>
                      <KittyQuill value={pageForm.body} onChange={(html) => setPageForm({ ...pageForm, body: html })} />
                    </div>
                  </fieldset>
                  <div className={styles.inlineActions}>
                    <button type="submit">{editingPageId ? 'Update Page' : 'Create Page'}</button>
                    {editingPageId ? <button type="button" className={styles.secondaryBtn} onClick={() => { setEditingPageId(null); setPageForm({ title: '', slug: '', icon: '', subtitle: '', body: '', showInNav: true, isPublished: false, sortOrder: 0 }); }}>Cancel</button> : null}
                  </div>
                </form>
              </section>
              <section className={styles.section}>
                <h2>Pages ({adminPages.length})</h2>
                <div className={styles.storyList}>
                  {adminPages.map((pg) => (
                    <article key={pg.id} className={styles.storyCard}>
                      <header>
                        <strong>{pg.icon ? `${pg.icon} ` : ''}{pg.title}</strong>
                        <span>{pg.isPublished ? 'Published' : 'Draft'} &middot; /{pg.slug}</span>
                      </header>
                      {pg.subtitle ? <p className={styles.help}>{pg.subtitle}</p> : null}
                      <p className={styles.help}>Sort: {pg.sortOrder} &middot; Nav: {pg.showInNav ? 'Yes' : 'No'}</p>
                      <div className={styles.inlineActions}>
                        <button type="button" onClick={() => handleEditPage(pg)}>Edit</button>
                        <button type="button" onClick={() => handleDeletePage(pg.id)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
                {adminPages.length === 0 ? <p className={styles.help}>No pages yet. Create one above.</p> : null}
              </section>
            </>
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
          id="admin-panel-navigation"
          role="tabpanel"
          aria-labelledby="admin-tab-navigation"
          hidden={activeTab !== 'navigation'}
        >
          {activeTab === 'navigation' && (
            <>
              <section className={styles.section}>
                <h2>{editingNavId ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
                <form onSubmit={handleSaveNavItem} className={styles.form}>
                  <label>Label <input value={navForm.label} onChange={(e) => setNavForm({ ...navForm, label: e.target.value })} required /></label>
                  <label>Link to page
                    <select value={navForm.pageId} onChange={(e) => {
                      const pid = e.target.value;
                      const pg = adminPages.find((p) => String(p.id) === pid);
                      setNavForm({ ...navForm, pageId: pid, url: '', label: navForm.label || (pg ? pg.title : '') });
                    }}>
                      <option value="">None (custom URL)</option>
                      {adminPages.map((pg) => <option key={pg.id} value={pg.id}>{pg.title}{pg.isPublished ? '' : ' (draft)'}</option>)}
                    </select>
                  </label>
                  {!navForm.pageId && (
                    <label>Custom URL <input value={navForm.url} onChange={(e) => setNavForm({ ...navForm, url: e.target.value })} placeholder="/votes or https://..." /></label>
                  )}
                  <label>Parent
                    <select value={navForm.parentId} onChange={(e) => setNavForm({ ...navForm, parentId: e.target.value })}>
                      <option value="">None (top level)</option>
                      {navItems.filter((ni) => !ni.parentId && ni.id !== editingNavId).map((ni) => <option key={ni.id} value={ni.id}>{ni.label}</option>)}
                    </select>
                  </label>
                  <label>Sort order <input type="number" value={navForm.sortOrder} onChange={(e) => setNavForm({ ...navForm, sortOrder: Number(e.target.value) })} /></label>
                  <label className={styles.checkboxLabel}><input type="checkbox" checked={navForm.isVisible} onChange={(e) => setNavForm({ ...navForm, isVisible: e.target.checked })} /> Visible</label>
                  <label className={styles.checkboxLabel}><input type="checkbox" checked={navForm.openInNewTab} onChange={(e) => setNavForm({ ...navForm, openInNewTab: e.target.checked })} /> Open in new tab</label>
                  <div className={styles.inlineActions}>
                    <button type="submit">{editingNavId ? 'Update' : 'Add'} Menu Item</button>
                    {editingNavId ? <button type="button" className={styles.secondaryBtn} onClick={() => { setEditingNavId(null); setNavForm({ label: '', pageId: '', url: '', parentId: '', sortOrder: 0, isVisible: true, openInNewTab: false }); }}>Cancel</button> : null}
                  </div>
                </form>
              </section>
              <section className={styles.section}>
                <h2>Menu Items ({navItems.length})</h2>
                <p className={styles.help}>Top-level items appear in the nav bar. Children appear as dropdowns under their parent.</p>
                <div className={styles.storyList}>
                  {navItems.filter((ni) => !ni.parentId).map((ni) => (
                    <article key={ni.id} className={styles.storyCard}>
                      <header>
                        <strong>{ni.label}</strong>
                        <span>{ni.pageSlug ? `/p/${ni.pageSlug}` : ni.url || '/'} {ni.isVisible ? '' : '(hidden)'}</span>
                      </header>
                      <p className={styles.help}>Order: {ni.sortOrder}{ni.pageTitle ? ` · Page: ${ni.pageTitle}` : ''}</p>
                      <div className={styles.inlineActions}>
                        <button type="button" onClick={() => handleEditNavItem(ni)}>Edit</button>
                        <button type="button" onClick={() => handleDeleteNavItem(ni.id)}>Delete</button>
                      </div>
                      {navItems.filter((child) => child.parentId === ni.id).map((child) => (
                        <article key={child.id} className={styles.storyCard} style={{ marginLeft: '1.5rem', marginTop: '0.5rem', borderLeft: '3px solid var(--accent, #6c9)' }}>
                          <header>
                            <strong>{child.label}</strong>
                            <span>{child.pageSlug ? `/p/${child.pageSlug}` : child.url || '/'} {child.isVisible ? '' : '(hidden)'}</span>
                          </header>
                          <div className={styles.inlineActions}>
                            <button type="button" onClick={() => handleEditNavItem(child)}>Edit</button>
                            <button type="button" onClick={() => handleDeleteNavItem(child.id)}>Delete</button>
                          </div>
                        </article>
                      ))}
                    </article>
                  ))}
                </div>
                {navItems.length === 0 ? <p className={styles.help}>No nav items yet. Add one above, or run the migration seed script.</p> : null}
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
          id="admin-panel-expenses"
          role="tabpanel"
          aria-labelledby="admin-tab-expenses"
          hidden={activeTab !== 'expenses'}
        >
          {activeTab === 'expenses' && (
            <>
              <div className={styles.expenseFormsRow}>
              <section className={styles.section}>
                <h2>{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</h2>
                <form onSubmit={handleSaveExpense} className={styles.form}>
                  <label>Title <input value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} /></label>
                  <label>Notes <input value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} /></label>
                  <label>Date <input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></label>
                  <fieldset className={styles.fieldset}>
                    <legend>Splits</legend>
                    {expenseForm.splits.map((split, idx) => (
                      <div key={idx} className={styles.inlineActions}>
                        <select value={split.userId} onChange={(e) => updateSplitRow(idx, 'userId', e.target.value)}>
                          <option value="">Select person</option>
                          {users.filter((u) => !u.isAdmin).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <input type="number" step="0.01" placeholder="£0.00" value={split.amount} onChange={(e) => updateSplitRow(idx, 'amount', e.target.value)} style={{ width: 120 }} />
                        {expenseForm.splits.length > 1 ? <button type="button" onClick={() => removeSplitRow(idx)}>✕</button> : null}
                      </div>
                    ))}
                    <button type="button" className={styles.secondaryBtn} onClick={addSplitRow}>+ Add split</button>
                  </fieldset>
                  <div className={styles.inlineActions}>
                    <button type="submit">{editingExpenseId ? 'Update' : 'Create'} Expense</button>
                    {editingExpenseId ? <button type="button" className={styles.secondaryBtn} onClick={resetExpenseForm}>Cancel</button> : null}
                  </div>
                </form>
              </section>

              <section className={styles.section}>
                <h2>Record Payment</h2>
                <form onSubmit={handleCreatePayment} className={styles.form}>
                  <label>Person
                    <select value={paymentForm.userId} onChange={(e) => setPaymentForm({ ...paymentForm, userId: e.target.value })}>
                      <option value="">Select person</option>
                      {users.filter((u) => !u.isAdmin).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </label>
                  <label>Linked expense (optional)
                    <select value={paymentForm.expenseId} onChange={(e) => setPaymentForm({ ...paymentForm, expenseId: e.target.value })}>
                      <option value="">None</option>
                      {adminExpenses.map((exp) => <option key={exp.id} value={exp.id}>{exp.title}</option>)}
                    </select>
                  </label>
                  <label>Amount (£) <input type="number" step="0.01" placeholder="0.00" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></label>
                  <label>Date <input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} /></label>
                  <label>Notes <input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></label>
                  <button type="submit">Record Payment</button>
                </form>
              </section>
              </div>

              <section className={styles.section}>
                <h2>Balances</h2>
                {adminBalances.length > 0 ? (
                  <table className={styles.expenseTable}>
                    <thead><tr><th>Name</th><th>Owed</th><th>Paid</th><th>Balance</th></tr></thead>
                    <tbody>
                      {adminBalances.map((b) => (
                        <tr key={b.userId}>
                          <td>{b.name}</td>
                          <td>£{((b.owedPence || 0) / 100).toFixed(2)}</td>
                          <td>£{((b.paidPence || 0) / 100).toFixed(2)}</td>
                          <td style={{ color: (b.balancePence || 0) >= 0 ? '#0a7f2e' : '#b91c1c', fontWeight: 700 }}>
                            £{((b.balancePence || 0) / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className={styles.help}>No balance data yet.</p>}
              </section>

              <section className={styles.section}>
                <h2>Expenses ({adminExpenses.length})</h2>
                <div className={styles.storyList}>
                  {adminExpenses.map((exp) => (
                    <article key={exp.id} className={styles.storyCard}>
                      <header>
                        <strong>{exp.title}</strong>
                        <span>{exp.expense_date || 'No date'}</span>
                      </header>
                      {exp.notes ? <p className={styles.help}>{exp.notes}</p> : null}
                      <p>Total: £{((exp.totalPence || 0) / 100).toFixed(2)} · {exp.splits?.length || 0} splits · {exp.payments?.length || 0} payments</p>
                      <div className={styles.inlineActions}>
                        <button type="button" onClick={() => startEditExpense(exp)}>Edit</button>
                        <button type="button" onClick={() => handleDeleteExpense(exp.id)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
                {adminExpenses.length === 0 ? <p className={styles.help}>No expenses yet.</p> : null}
              </section>

              <section className={styles.section}>
                <h2>Payments ({adminPayments.length})</h2>
                <div className={styles.storyList}>
                  {adminPayments.map((pay) => (
                    <article key={pay.id} className={styles.storyCard}>
                      <header>
                        <strong>{pay.userName || 'Unknown'}</strong>
                        <span>£{((pay.amountPence || 0) / 100).toFixed(2)}</span>
                      </header>
                      <p className={styles.help}>{pay.notes || ''} {pay.paymentDate ? `· ${pay.paymentDate}` : ''}</p>
                      <div className={styles.inlineActions}>
                        <button type="button" onClick={() => handleDeletePayment(pay.id)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
                {adminPayments.length === 0 ? <p className={styles.help}>No payments yet.</p> : null}
              </section>
            </>
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
