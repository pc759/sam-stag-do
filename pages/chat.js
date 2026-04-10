import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import styles from '../styles/Chat.module.css';
import pageStyles from '../styles/Page.module.css';

const MarkdownRenderer = dynamic(() => import('../components/MarkdownRenderer'), { ssr: false });

export default function ChatPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [chatEnabled, setChatEnabled] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Troubled soul, unburden yourself... tell me about Sam's sins and I shall dispense wisdom, judgment, and probably ridicule."
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [cmsPage, setCmsPage] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    const loadData = async () => {
      try {
        const contentRes = await fetch('/api/site-content');
        if (contentRes.ok) {
          const content = await contentRes.json();
          setChatEnabled((content.chatEnabled || 'true').toLowerCase() === 'true');
        }
        try { const cmsRes = await fetch('/api/pages?slug=chat'); if (cmsRes.ok) setCmsPage(await cmsRes.json()); } catch (e) { /* silent */ }
      } catch (err) {
        // silent
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [authLoading, isAuthenticated, router]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage = { role: 'user', text: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          conversationId: conversationId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to get response');
      } else {
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      }
    } catch (err) {
      setError('Failed to connect to chat service');
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || dataLoading) return <div className={styles.loading}>Loading...</div>;
  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className={styles.container}>
        <div className={pageStyles.contentCard}>
          <div className={styles.chatHeader}>
            <h1>{cmsPage?.title || 'Dear Stagony Aunt'}</h1>
            <button
              type="button"
              className={styles.newChatBtn}
              onClick={() => {
                setConversationId(null);
                setMessages([
                  {
                    role: 'assistant',
                    text: "Troubled soul, unburden yourself... tell me about Sam's sins and I shall dispense wisdom, judgment, and probably ridicule."
                  }
                ]);
                setError('');
              }}
              disabled={!chatEnabled || isSending}
            >
              New conversation
            </button>
          </div>
          {cmsPage?.body?.trim() && (
            <div className={pageStyles.prose}><MarkdownRenderer content={cmsPage.body} /></div>
          )}
        </div>
        {!chatEnabled && (
          <p className={styles.disabled}>
            Chat is currently disabled by admin settings.
          </p>
        )}
        <div className={styles.chatBox}>
          {messages.map((msg, idx) => (
            <div
              key={`${msg.role}-${idx}`}
              className={`${styles.message} ${msg.role === 'user' ? styles.user : styles.assistant}`}
            >
              {msg.text}
            </div>
          ))}
          {isSending && <div className={styles.assistant}>Thinking...</div>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <form className={styles.form} onSubmit={sendMessage}>
          <textarea
            rows="3"
            placeholder="Dear Stagony Aunt, I need to tell you about the time Sam..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!chatEnabled || isSending}
          />
          <button type="submit" disabled={!chatEnabled || isSending || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </Layout>
  );
}
