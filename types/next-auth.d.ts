// types/next-auth.d.ts
// extends the default types provided by NextAuth.js
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id?: string;
    fluentLanguage?: string;
    practiceLanguage?: string;
  }

  interface Session {
    user: User;
  }
}
