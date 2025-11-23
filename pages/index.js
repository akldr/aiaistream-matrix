export default function Home() {
  return (
    <main style={{fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans'}}>
      <div style={{maxWidth: 900, margin: '4rem auto', padding: '1rem'}}>
        <h1 style={{fontSize: '2rem', marginBottom: '0.5rem'}}>Welcome to aiai.stream</h1>
        <p style={{color: '#444'}}>This is a minimal Next.js starter scaffold. Run <code>npm run dev</code> to start the dev server.</p>
        <div style={{marginTop: '1.25rem', padding: '1rem', border: '1px solid #eee', borderRadius: 8}}>
          <strong>Ready for development</strong>
          <p style={{marginTop: '0.5rem'}}>Edit <code>pages/index.js</code> and refresh.</p>
        </div>
      </div>
    </main>
  )
}
