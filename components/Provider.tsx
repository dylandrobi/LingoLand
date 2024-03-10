import React, { ReactNode } from 'react';
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";

type ProviderProps = {
  children: ReactNode;
  session: Session;
};

const Provider: React.FC<ProviderProps> = ({ children, session }) => (
  <SessionProvider session={session}>
    {children}
  </SessionProvider>
);

export default Provider;
