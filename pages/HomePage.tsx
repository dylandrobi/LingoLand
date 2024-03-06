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

// const HomePage: React.FC = () => {
//   const { data: session } = useSession();

//   return (
//     <div>
//       {!session ? (
//         <button onClick={() => signIn('google')}>Sign in with Google</button>
//       ) : (
//         <div>
//         <p>Welcome, {session.user.email}</p>
//         <Link href="/chat">
//           <button>Go to Chat</button>
//         </Link>
//         </div>
//       )}
//     </div>
//   );
// };

// export default HomePage;
