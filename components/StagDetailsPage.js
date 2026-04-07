import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from './Layout';
import styles from '../styles/Details.module.css';
import { defaultContent } from '../lib/siteContent';

export default function StagDetailsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState(defaultContent);
  const [attendingUsers, setAttendingUsers] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/check-auth', { method: 'GET' });
        if (res.status === 401) {
          router.push('/login');
        } else {
          const authData = await res.json();
          setIsAuthenticated(true);
          setUser(authData.user);

          const [contentRes, rosterRes] = await Promise.all([
            fetch('/api/site-content'),
            fetch('/api/roster')
          ]);

          if (contentRes.ok) {
            const contentData = await contentRes.json();
            setContent(contentData);
          }

          if (rosterRes.ok) {
            const roster = await rosterRes.json();
            const attending = roster.filter((attendee) =>
              (attendee.tags || []).some((tag) => tag.name?.toLowerCase() === 'attending')
            );
            setAttendingUsers(attending);
          }
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <div className={styles.heroWrap}>
          <div className={styles.fogLayer} aria-hidden="true">
            <span className={styles.fogA} />
            <span className={styles.fogB} />
          </div>
          <header className={styles.hero}>
            <p className={styles.kicker}>Stag HQ</p>
            <h1>Stag Do Details</h1>
            <p className={styles.subtitle}>Everything you need to know about the weekend</p>
          </header>
        </div>

        <div className={styles.bento}>
          <section className={`${styles.card} ${styles.whenCard}`}>
            <div className={styles.icon}>📅</div>
            <h2>When</h2>
            <p className={styles.highlight}>{content.detailsWhen}</p>
            <p>{content.detailsWhenDescription}</p>
          </section>

          <section className={`${styles.card} ${styles.whereCard}`}>
            <div className={styles.icon}>📍</div>
            <h2>Where</h2>
            <p className={styles.highlight}>{content.detailsWhere}</p>
            <p>{content.detailsWhereDescription}</p>
            {content.detailsWhereMapEmbedUrl ? (
              <div className={styles.mapWrap}>
                <iframe
                  src={content.detailsWhereMapEmbedUrl}
                  className={styles.mapFrame}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  title="Stag do location map"
                />
              </div>
            ) : null}
            <div className={styles.whereLinks}>
              {content.detailsWhereMapLinkUrl ? (
                <a href={content.detailsWhereMapLinkUrl} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              ) : null}
              {content.detailsAccommodationUrl ? (
                <a href={content.detailsAccommodationUrl} target="_blank" rel="noreferrer">
                  View Accommodation
                </a>
              ) : null}
            </div>
          </section>

          <section className={`${styles.card} ${styles.whoCard}`}>
            <div className={styles.icon}>👥</div>
            <h2>Who</h2>
            <p className={styles.highlight}>
              {attendingUsers.length ? `${attendingUsers.length} Attending` : content.detailsWho}
            </p>
            <p>{content.detailsWhoDescription}</p>
            <div className={styles.attendeeList}>
              {attendingUsers.length > 0 ? (
                attendingUsers.map((attendee) => (
                  <Link key={attendee.id} href={`/attendees/${attendee.id}`} className={styles.attendeePill}>
                    {attendee.photoUrl ? (
                      <img src={attendee.photoUrl} alt={attendee.name} className={styles.attendeeAvatar} />
                    ) : (
                      <span className={styles.attendeeInitial}>{attendee.name?.[0] || '?'}</span>
                    )}
                    <span>{attendee.name}</span>
                  </Link>
                ))
              ) : (
                <p className={styles.emptyAttending}>
                  No attendees are tagged <strong>Attending</strong> yet. Add the tag in admin.
                </p>
              )}
            </div>
          </section>

          <section className={`${styles.card} ${styles.costCard}`}>
            <div className={styles.icon}>💰</div>
            <h2>Cost</h2>
            <p className={styles.highlight}>{content.detailsCost}</p>
            <p>{content.detailsCostDescription}</p>
          </section>

          <section className={`${styles.card} ${styles.bringCard}`}>
            <h2>What to Bring</h2>
            <ul className={styles.list}>
              {content.detailsBring.split('\n').filter(Boolean).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={`${styles.card} ${styles.itineraryCard}`}>
            <h2>Itinerary</h2>
            <p>{content.detailsItinerary}</p>
          </section>

          <section className={`${styles.card} ${styles.questionsCard}`}>
            <h2>Questions?</h2>
            <p>
              Have questions about the stag do? Drop them in the chat (coming soon) or reach out to the group.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
