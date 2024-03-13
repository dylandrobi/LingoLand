import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import React from 'react';
import Nav from '../components/Nav';



const HomePage: React.FC = () => {
  
  return (
    <div>
      <Nav />
      {/* Other content of the HomePage */}
    </div>
  );
};

export default HomePage;