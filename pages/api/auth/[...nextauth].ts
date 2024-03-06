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
      session.user.id = token.uid;
      if (token.uid) {
        const userInDb = await User.findById(token.uid);
        
        if (userInDb) {
          session.user.fluentLanguages = userInDb.fluentLanguages;
          session.user.practiceLanguage = userInDb.practiceLanguage;
        }
      }
      return session;
    },
  },
  

  // callbacks: {
  //   async signIn({ user, account, profile }) {
  //     console.log("Signing in", user);
  //     try {
  //       const { email } = user;
  //       if (email) {
  //         const existingUser = await User.findOne({ email }).exec();
  //         if (!existingUser) {
  //           const newUser = await User.create({ email });
  //           user.id = newUser._id.toString();
  //         } else {
  //           user.id = existingUser._id.toString();
  //         }
  //       }
  //       return true;
  //     } catch (error) {
  //       console.error("Error in signIn callback", error);
  //       return false;
  //     }
  //   },
  //   async session({ session, user }) {
  //     console.log("Session callback", session, user);
  //     try {
  //       session.user.id = user.id;
  //       return session;
  //     } catch (error) {
  //       console.error("Error in session callback", error);
  //       return session;
  //     }
  //   },
  //   // ... other callbacks ...
  // },
  

  // callbacks: {
  //   async signIn({ user, account, profile }) {
  //     const { email } = user;
  //     if (email) {
  //       const existingUser = await User.findOne({ email }).exec();
  //       if (!existingUser) {
  //         const newUser = await User.create({ email });
  //         user.id = newUser._id.toString();
  //       } else {
  //         user.id = existingUser._id.toString();
  //       }
  //     }
  //     return true;
  //   },
  //   async session({ session, user }) {
  //     // Ensure the user ID is included in the session object
  //     session.user.id = user.id;
  //     return session;
  //   },
  //   // ... other callbacks ...
  // },

  // callbacks: {
  //   async signIn({ user }) {
  //     const { email } = user;
  //     if (email) {
  //       let existingUser = await User.findOne({ email }).exec();
  //       if (!existingUser) {
  //         existingUser = await User.create({ email });
  //       }
  //       // Attach the MongoDB ObjectId to the user object
  //       user.id = existingUser._id.toString();
  //     }
  //     return true;
  //   },
  //   async session({ session, user }) {
  //     // Ensure the user ID is included in the session object
  //     if (user?.id) {
  //       session.user.id = user.id;
  //     }
  //     return session;
  //   },
  //   // ... other callbacks ...
  // },

});
  // callbacks: {
  //   async signIn({ user }) {
  //     const { email } = user;
  //     if (email) {
  //       const existingUser = await User.findOne({ email }).exec();
  //       if (!existingUser) {
  //         await User.create({ email });
  //       }
  //       // Return the user's email or ID here if needed
  //       return true;
  //     }
  //     return false;
  //   },
  //   async session({ session, user }) {
  //     // Attach the user's ID (or email) to the session
  //     if (user) {
  //       session.user.id = user.id; // Or use another unique identifier
  //     }
  //     return session;
  //   },
  // },

