import dynamic from 'next/dynamic';
import Head from 'next/head';

const MatrixAI = dynamic(() => import('../components/MatrixAI'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>aiai.stream — Matrix AI preview</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Noto Sans'}}>
        <div style={{maxWidth: 1200, margin: '2rem auto', padding: '1rem'}}>
          <h1 style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>Matrix AI — Preview</h1>
          <p style={{color: '#666', marginBottom: '1rem'}}>Interactive canvas preview (controls on the right). Depth-map preview may require CORS or a proxy.</p>
          <MatrixAI />
        </div>
      </main>
    </>
  );
}
