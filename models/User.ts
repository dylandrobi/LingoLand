import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  email: string;
  fluentLanguages: {
    English: boolean;
    Spanish: boolean;
    Chinese: boolean;
  };
  practiceLanguage: string;
  partnerLanguagePreference: string;
  partnerPreferenceOption: string;
  // fluentLanguage: string;
  // practiceLanguage: string;
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  fluentLanguages: {
  English: { type: Boolean, default: false },
  Spanish: { type: Boolean, default: false },
  Chinese: { type: Boolean, default: false },
  },
  
  practiceLanguage: { type: String, default: ''},
  partnerLanguagePreference: { type: String, default: '' },
  partnerPreferenceOption: { type: String, default: 'any' },

});

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
