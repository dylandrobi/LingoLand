import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import mongoose from 'mongoose';
import User from '../../../models/User'; // Update this path to your User model

mongoose.connect(process.env.MONGODB_URI!);

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      const { email } = user;
      if (email) {
        const existingUser = await User.findOne({ email }).exec();
        if (!existingUser) {
          const newUser = await User.create({ email });
          user.id = newUser._id.toString();
        } else {
          user.id = existingUser._id.toString();
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // If user just signed in, add their ID to the token
      if (user?.id) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // OLD: session.user.id = token.uid;
      session.user.id = token.uid as string;
      if (token.uid) {
        const userInDb = await User.findById(token.uid);
        
        if (userInDb) {
          session.user.fluentLanguage = userInDb.fluentLanguages;
          session.user.practiceLanguage = userInDb.practiceLanguage;
        }
      }
      return session;
    },
  },

});