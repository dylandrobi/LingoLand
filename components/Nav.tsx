import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import React from 'react';
import ProfileDropdown from './ProfileDropdown';


const Nav: React.FC = () => {
  const { data: session } = useSession();
  const [isAllowedUser, setIsAllowedUser] = useState(false);

  useEffect(() => {
    // Immediately after sign in, check if the user's email is from union.edu
    if (session?.user?.email?.endsWith('@union.edu')) {
      setIsAllowedUser(true);
    } else if (session?.user?.email) {
      setIsAllowedUser(false);
      // Show an alert if the email does not end with "@union.edu"
      window.alert("Invalid Email Type, must use union.edu email.");
      // Optionally, sign out the user
      signOut();
    }
  }, [session]);

  return (
    <nav className="bg-blue-500 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <Link href="/">
            <div className="text-white font-bold text-lg hover:text-blue-300 mr-4">Home</div>
          </Link>
          {session && isAllowedUser && (
            <Link href="/chat">
              <div className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">Go to Chat</div>
            </Link>
          )}
          <button>
            <Link href="https://docs.google.com/forms/d/e/1FAIpQLSfWsSzBMEiN8wtuSnHtwRTmyvai6K4kbbZ-38fABLvb5rFfvA/viewform?usp=sf_link">
              <div className="feedback-button">Click here to give feedback!</div>
            </Link>
          </button>
          
        </div>
        <div>
          {session ? (
            <>
              <span className="mr-4">Welcome, {session.user.email}</span>
              <ProfileDropdown />
              <button onClick={() => signOut()} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ml-4">Sign Out</button>
            </>
          ) : (
            <button onClick={() => signIn('google')} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Sign in with Google</button>
          )}
        </div>
      </div>
    </nav>
    
    
  );
  
};

export default Nav;