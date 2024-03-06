// pages/language-preferences.tsx

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import { signIn } from 'next-auth/react';


//NEW STUFF HAS "NEW" BEFORE IT

//NEW 
  const LanguagePreferences: React.FC = () => {
  const { data: session, status } = useSession();
  const [fluentLanguages, setFluentLanguages] = useState({
  English: false,
  Spanish: false,
  Chinese: false,
});
const [userPreferences, setUserPreferences] = useState({
  fluentLanguages: {},
  practiceLanguage: '',
  partnerLanguagePreference: '',
  partnerPreferenceOption: '',
});

  const [partnerLanguagePreference, setPartnerLanguagePreference] = useState('');
  const [partnerPreferenceOption, setPartnerPreferenceOption] = useState('any');
  const [fetchedFluentLanguages, setFetchedFluentLanguages] = useState({});
  const [showFluentLanguages, setShowFluentLanguages] = useState(false);
  


  // ... rest of your component ...

// Function which clears all of the user's saved preferences
  const handleClearPreferences = () => {
    setFluentLanguages({
      English: false,
      Spanish: false,
      Chinese: false,
    });
    setPracticeLanguage('');
    setPartnerLanguagePreference('');
    setPartnerPreferenceOption('any');
  };

  // NEW: Function to handle fluent language checkbox changes
const handleFluentLanguageChange = (language) => {
  setFluentLanguages(prev => ({ ...prev, [language]: !prev[language] }));
};

// NEW: Function to handle practice language radio button change
const handlePracticeLanguageChange = (e) => {
  setPracticeLanguage(e.target.value);
};

// Function to render options for the dropdown
  const renderFluentLanguageOptions = () => {
    return Object.entries(fluentLanguages).filter(([lang, isFluent]) => isFluent).map(([lang]) => (
      <option key={lang} value={lang}>{lang}</option>
    ));
  };

  



  console.log("Session immediately on load:", session);
  const [fluentLanguage, setFluentLanguage] = useState<string>('');
  const [practiceLanguage, setPracticeLanguage] = useState<string>('');
  
    useEffect(() => {
      const fetchPreferences = async () => {
          if (session && session.user) {
            try {
            const response = await fetch(`/api/user/${session.user.id}/preferences`);
        if (response.ok) {
          const data = await response.json();
          // Update state based on fetched preferences
            setFluentLanguages(data.fluentLanguages || {});
            setPracticeLanguage(data.practiceLanguage || '');
            setPartnerLanguagePreference(data.partnerLanguagePreference || '');
            setPartnerPreferenceOption(data.partnerPreferenceOption || 'any');
          // Add similar lines for partner preferences if you have them
        } else {
          // Handle errors (e.g., show an error message)
        }
      } catch (error) {
        // Handle errors (e.g., show an error message)
      }
    }
  };

  

    const fetchFluentLanguages = async () => {
      const response = await fetch(`/api/user/${session?.user?.id}/preferences`);
      if (response.ok) {
        const data = await response.json();
        setFetchedFluentLanguages(data.fluentLanguages);
      } else {
        console.error("Error fetching fluent languages");
      }
    };

    if (session?.user?.id) {
      fetchFluentLanguages();
      fetchPreferences();
    }
  }, [session?.user?.id]);

  const formatStrangerPreference = () => {
    switch (partnerPreferenceOption) {
      case 'specific':
        return partnerLanguagePreference;
      case 'languageImPracticing':
        return practiceLanguage;
      case 'any':
        const fluentLanguagesList = Object.keys(fluentLanguages)
          .filter(lang => fluentLanguages[lang])
          .join(', ');
        return fluentLanguagesList.length > 1 ? `one of: ${fluentLanguagesList}` : fluentLanguagesList;
      default:
        return 'Not specified';
    }
  };

  // Check if at least one fluent language is selected
  const isFluentLanguageSelected = Object.values(fluentLanguages).some(value => value);

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  

  // NEW METHOD BELOW

  const handleSavePreferences = async () => {
    if (status !== "authenticated") {
      alert('You must be signed in to save preferences.');
      return;
    }
    const payload = {
      fluentLanguages, // send the entire object
      practiceLanguage,
      partnerLanguagePreference,
      partnerPreferenceOption
    };
  
    try {
      const response = await fetch(`/api/user/${session.user.id}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fluentLanguages, 
          practiceLanguage,
          partnerLanguagePreference,
          partnerPreferenceOption }),
      });
  
      
      if (!response.ok) {
        throw new Error(`Failed to save preferences: ${response.status}`);
      }
  
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error saving preferences');
    }
  };

  const toggleFluentLanguagesDropdown = () => {
    setShowFluentLanguages(!showFluentLanguages);
  };



  // Redirect to sign-in page if not logged in
  if (!session) {
    return <p>Access denied. You need to be signed in to view this page.</p>;
  }




  // NEW RETURN BELOW

  return (
    <>
    <Head>
      <title>Language Preferences</title>
      <meta name="description" content="Select your language preferences" />
    </Head>
  <div className="container mx-auto px-4">
    <h1 className="text-2xl font-bold text-center my-4">Language Preferences</h1>

    <div className="mb-6">
      <h2
      onClick={toggleFluentLanguagesDropdown} style={{ cursor: 'pointer' }} 
      className="text-xl font-semibold">
        
        My Fluent Languages:
        {showFluentLanguages ? ' ▲' : ' ▼'}
        </h2>
        {showFluentLanguages && (
          <div>
      {Object.keys(fluentLanguages).map((language) => (
        <div key={language}>
    <input
      type="checkbox"
      id={language}
      name={language}
      checked={fluentLanguages[language] || false}
      onChange={() => handleFluentLanguageChange(language)}
    />
    <label htmlFor={language}>{language}</label>
  </div>
      ))}
    </div>
    )}
    </div>
    <div className="mb-6">
      <h2 className="text-xl font-semibold">I will practice:</h2>
      <div>
  <input
    type="radio"
    id="EnglishPractice"
    name="practiceLanguage"
    value="English"
    checked={practiceLanguage === "English"}
    onChange={handlePracticeLanguageChange}
  />
  <label htmlFor="EnglishPractice">English</label>
</div>
<div>
  <input
    type="radio"
    id="SpanishPractice"
    name="practiceLanguage"
    value="Spanish"
    checked={practiceLanguage === "Spanish"}
    onChange={handlePracticeLanguageChange}
  />
  <label htmlFor="SpanishPractice">Spanish</label>
</div>
<div>
  <input
    type="radio"
    id="ChinesePractice"
    name="practiceLanguage"
    value="Chinese"
    checked={practiceLanguage === "Chinese"}
    onChange={handlePracticeLanguageChange}
  />
  <label htmlFor="ChinesePractice">Chinese</label>
</div>
          </div>

      <div className="mb-6">
          <h2 className="text-xl font-semibold">Partner will practice:</h2>
      <div>
        <label>
          <input
            type="radio"
            name="partnerPreference"
            value="specific"
            checked={partnerPreferenceOption === 'specific'}
            onChange={() => setPartnerPreferenceOption('specific')}
          />
          Partner must practice:
          <select
            disabled={partnerPreferenceOption !== 'specific'}
            value={partnerLanguagePreference}
            onChange={(e) => setPartnerLanguagePreference(e.target.value)}
          >
            <option value="">Select Language</option>
            {renderFluentLanguageOptions()}
          </select>
        </label>
      </div>

      <div>
        <label>
          <input
            type="radio"
            name="partnerPreference"
            value="languageImPracticing"
            checked={partnerPreferenceOption === 'languageImPracticing'}
            onChange={() => setPartnerPreferenceOption('languageImPracticing')}
          />
          Partner must practice language I'm practicing
        </label>
      </div>

      <div>
        <label>
          <input
            type="radio"
            name="partnerPreference"
            value="any"
            checked={partnerPreferenceOption === 'any'}
            onChange={() => setPartnerPreferenceOption('any')}
          />
          Partner can practice any language I'm fluent in
        </label>
      </div>

      </div>

      <div className="flex justify-between">
      <button 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleSavePreferences} 
            disabled={!isFluentLanguageSelected || !practiceLanguage}
            >
          Save Preferences
        </button>

        <button
        className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
        onClick={handleClearPreferences}>
        Clear All
      </button>

      <button 
      className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
      onClick={() => window.history.back()}>Back</button>
      </div>


      <div>
      {/* ... your existing JSX for language preferences ... */}

      {/* Displaying the saved preferences */}
      <div>
        <p>I am going to practice: {practiceLanguage}</p>
        <p>My partner is going to practice: {formatStrangerPreference()}</p>
      </div>
    </div>
  </div>
  </>
);
};
export default LanguagePreferences;

//NEW RETURN ABOVE

//OLD RETURN BELOW

//   return (
//     <div>
//       <h1>Language Preferences</h1>
//       <div>
//         <h2>My Fluent Language:</h2>
//         {/* Fluent Language Buttons */}
//         <button disabled={practiceLanguage === 'English'} onClick={() => setFluentLanguage('English')}>English</button>
//         <button disabled={practiceLanguage === 'Spanish'} onClick={() => setFluentLanguage('Spanish')}>Spanish</button>
//       </div>
//       <div>
//         <h2>Language I Want to Practice:</h2>
//         {/* Practice Language Buttons */}
//         <button disabled={fluentLanguage === 'English'} onClick={() => setPracticeLanguage('English')}>English</button>
//         <button disabled={fluentLanguage === 'Spanish'} onClick={() => setPracticeLanguage('Spanish')}>Spanish</button>
//       </div>
//       <div>
//         <button onClick={handleSavePreferences} disabled={!fluentLanguage || !practiceLanguage || fluentLanguage === practiceLanguage}>
//           Save Preferences
//         </button>
//         <button onClick={() => window.history.back()}>Back</button>
//       </div>
//     </div>
//   );
// };

//OLD RETURN ^^^


      
