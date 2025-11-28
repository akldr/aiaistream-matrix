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
      <MatrixAI />
    </>
  );
}
