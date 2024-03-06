// LanguagePreferences.tsx
import React, { useState } from 'react';

const LanguagePreferences = () => {
  const [fluentLanguage, setFluentLanguage] = useState('');
  const [practiceLanguage, setPracticeLanguage] = useState('');

  const handleSave = async () => {
    // API call to save preferences
    // Example: PUT /api/user/[userId]/preferences
  };

  const isSaveEnabled = fluentLanguage && practiceLanguage && fluentLanguage !== practiceLanguage;

  return (
    <div>
      {/* Fluent Language Section */}
      <div>
        <h2>My Fluent Language:</h2>
        <button onClick={() => setFluentLanguage('English')} disabled={practiceLanguage === 'English'}>English</button>
        <button onClick={() => setFluentLanguage('Spanish')} disabled={practiceLanguage === 'Spanish'}>Spanish</button>
      </div>

      {/* Practice Language Section */}
      <div>
        <h2>Language I Want to Practice:</h2>
        <button onClick={() => setPracticeLanguage('English')} disabled={fluentLanguage === 'English'}>English</button>
        <button onClick={() => setPracticeLanguage('Spanish')} disabled={fluentLanguage === 'Spanish'}>Spanish</button>
      </div>

      {/* Save and Back Buttons */}
      <button onClick={handleSave} disabled={!isSaveEnabled}>Save</button>
      <button onClick={() => window.history.back()}>Back</button>
    </div>
  );
};

export default LanguagePreferences;
