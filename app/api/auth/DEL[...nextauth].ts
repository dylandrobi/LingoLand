// import NextAuth from 'next-auth';
// import GoogleProvider from 'next-auth/providers/google';
// import mongoose from 'mongoose';
// import User from '../../../models/User'; // Update this path to your User model

// mongoose.connect(process.env.MONGODB_URI!);

// export default NextAuth({
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//   ],
//   callbacks: {
//     async signIn({ user }) {
//       const { email } = user;
//       if (email) {
//         const existingUser = await User.findOne({ email }).exec();
//         if (!existingUser) {
//           await User.create({ email });
//         }
//       }
//       return true;
//     },
//   },
// });
