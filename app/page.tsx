'use client'
import { useSearchParams } from 'next/navigation';

export default function Home() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const provider = searchParams.get('provider');


  return (
    <div className="flex justify-center items-center h-screen flex-col gap-5">
      {success === 'true' ? (
        <div className='mb-4 p-4 bg-green-200 text-green-800 rounded'>
          {provider === 'google' ? 'Signed in with Google' : provider === 'linkedin' ? 'Signed in with LinkedIn' : 'OAuth'}
        </div>
      ) : null}

      <h1>Auth Successful! This is the home page</h1>
    </div>
  );
}
