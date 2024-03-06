import mongoose, { Schema } from 'mongoose';

const RoomSchema = new mongoose.Schema({
  status: { type: String, required: true },
  user1: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  user1Preferences: {
    practiceLanguage: { type: String, default: '' },
    partnerLanguage: [{ type: String }] // Array of languages
  },
  user2: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  user2Preferences: {
    practiceLanguage: { type: String, default: '' },
    partnerLanguage: [{ type: String }] // Array of languages
  },
});

export default mongoose.models.Room || mongoose.model("Room", RoomSchema);
