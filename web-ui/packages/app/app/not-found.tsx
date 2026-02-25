import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 20% 20%, #f0f4ff, #e7ecf7)',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          padding: '2.5rem',
          borderRadius: 16,
          backgroundColor: '#fff',
          boxShadow: '0 18px 60px rgba(25, 52, 93, 0.12)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, letterSpacing: 2, color: '#6c7a92', margin: 0 }}>
          ERROR 404
        </p>
        <h1 style={{ fontSize: 36, margin: '0.5rem 0', color: '#102542' }}>
          Page not found
        </h1>
        <p style={{ color: '#4a5568', lineHeight: 1.6, margin: '1rem 0 1.5rem' }}>
          We couldn&rsquo;t find the page you were looking for. Try returning to the
          dashboard or jump into your latest messages.
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              padding: '0.85rem 1.4rem',
              borderRadius: 12,
              background: '#1d4ed8',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              minWidth: 140,
              textAlign: 'center',
            }}
            title='Go home'
          >
          </Link>

          <Link
            href="/messages"
            style={{
              padding: '0.85rem 1.4rem',
              borderRadius: 12,
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              textDecoration: 'none',
              fontWeight: 600,
              minWidth: 140,
              textAlign: 'center',
              background: '#f8fafc',
            }}
            title='View messages'
          >
          </Link>
        </div>

        <p style={{ color: '#94a3b8', marginTop: '1.5rem' }}>
          Need help? Reach out to support anytime.
        </p>
      </div>
    </main>
  );
}
