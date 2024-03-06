// ProfileDropdown.tsx
import React from 'react';
import { useRouter } from 'next/router';

const ProfileDropdown = () => {
  const router = useRouter();

  const goToLanguagePreferences = () => {
    router.push('/language-preferences'); // Adjust the route as needed
  };

  return (
    <div>
      {/* Dropdown menu items */}
      <button 
      className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded"
      onClick={goToLanguagePreferences}>Language Preferences</button>
      {/* ... other menu items ... */}
    </div>
  );
};

export default ProfileDropdown;
