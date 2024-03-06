import Link from 'next/link';
import React from 'react';
import { useSession, signIn } from "next-auth/react";

const HomePage: React.FC = () => {
  const { data: session } = useSession();

  return (
    <div>
      <h1>Welcome to Our Chat Application. Log in to continue</h1>
      {!session ? (
        <button onClick={() => signIn('google')}>Sign in with Google</button>
      ) : (
        
        <Link href="/chat">
          <button>Go to Chat</button>
        </Link>
      )}
    </div>
  );
};

export default HomePage;