import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import styles from '../styles/Chat.module.css';

export default function ChatPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Tell me a memory about Sam and I'll help you flesh it out with fun details."
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const authRes = await fetch('/api/check-auth');
        if (authRes.status === 401) {
          router.push('/login');
          return;
        }
        const authData = await authRes.json();
        setIsAuthenticated(true);
        setUser(authData.user);

        const contentRes = await fetch('/api/site-content');
        if (contentRes.ok) {
          const content = await contentRes.json();
          setChatEnabled((content.chatEnabled || 'true').toLowerCase() === 'true');
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [router]);

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

  if (isLoading) return <div className={styles.loading}>Loading...</div>;
  if (!isAuthenticated) return null;

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <div className={styles.chatHeader}>
          <h1>Memory Wingman Chat</h1>
          <button
            type="button"
            className={styles.newChatBtn}
            onClick={() => {
              setConversationId(null);
              setMessages([
                {
                  role: 'assistant',
                  text: "Tell me a memory about Sam and I'll help you flesh it out with fun details."
                }
              ]);
              setError('');
            }}
            disabled={!chatEnabled || isSending}
          >
            New conversation
          </button>
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
            placeholder="Drop a memory about Sam..."
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
