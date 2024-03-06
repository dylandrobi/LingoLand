import React, { ReactNode } from 'react';
import { SessionProvider, Session } from "next-auth/react";

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
