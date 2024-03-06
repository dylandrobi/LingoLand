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






// Define the type for the provider
// type Provider = {
//   id: string;
//   name: string;
// };

// // Define the type for the providers object
// type Providers = Record<string, Provider>;

// const Nav: React.FC = () => {
//   const { data: session } = useSession();

//   const [providers, setProviders] = useState<Providers | null>(null);
//   const [toggleDropdown, setToggleDropdown] = useState(false);

//   useEffect(() => {
//     (async () => {
//       const res = await getProviders();
//       setProviders(res as Providers);
//     })();
//   }, []);

//   return (
//     <nav className='flex-between w-full mb-16 pt-3'>
//       <Link href='/' className='flex gap-2 flex-center'>
//         <Image
//           src='/assets/images/logo.svg'
//           alt='logo'
//           width={30}
//           height={30}
//           className='object-contain'
//         />
//         <p className='logo_text'>Promptopia</p>
//       </Link>

//       {/* Desktop Navigation */}
//       <div className='sm:flex hidden'>
//         {session?.user ? (
//           <div className='flex gap-3 md:gap-5'>
//             <Link href='/create-prompt' className='black_btn'>
//               Create Post
//             </Link>

//             <button type='button' onClick={signOut} className='outline_btn'>
//               Sign Out
//             </button>

//             <Link href='/profile'>
//               <Image
//                 src={session?.user.image}
//                 width={37}
//                 height={37}
//                 className='rounded-full'
//                 alt='profile'
//               />
//             </Link>
//           </div>
//         ) : (
//           <>
//             {providers &&
//               Object.values(providers).map((provider) => (
//                 <button
//                   type='button'
//                   key={provider.name}
//                   onClick={() => {
//                     signIn(provider.id);
//                   }}
//                   className='black_btn'
//                 >
//                   Sign in
//                 </button>
//               ))}
//           </>
//         )}
//       </div>

//       {/* Mobile Navigation */}
//       <div className='sm:hidden flex relative'>
//         {session?.user ? (
//           <div className='flex'>
//             <Image
//               src={session?.user.image}
//               width={37}
//               height={37}
//               className='rounded-full'
//               alt='profile'
//               onClick={() => setToggleDropdown(!toggleDropdown)}
//             />

//             {toggleDropdown && (
//               <div className='dropdown'>
//                 <Link
//                   href='/profile'
//                   className='dropdown_link'
//                   onClick={() => setToggleDropdown(false)}
//                 >
//                   My Profile
//                 </Link>
//                 <Link
//                   href='/create-prompt'
//                   className='dropdown_link'
//                   onClick={() => setToggleDropdown(false)}
//                 >
//                   Create Prompt
//                 </Link>
//                 <button
//                   type='button'
//                   onClick={() => {
//                     setToggleDropdown(false);
//                     signOut();
//                   }}
//                   className='mt-5 w-full black_btn'
//                 >
//                   Sign Out
//                 </button>
//               </div>
//             )}
//           </div>
//         ) : (
//           <>
//             {providers &&
//               Object.values(providers).map((provider) => (
//                 <button
//                   type='button'
//                   key={provider.name}
//                   onClick={() => {
//                     signIn(provider.id);
//                   }}
//                   className='black_btn'
//                 >
//                   Sign in
//                 </button>
//               ))}
//           </>
//         )}
//       </div>
//     </nav>
//   );
// };

// export default Nav;
