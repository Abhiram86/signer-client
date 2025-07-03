import { getUser } from "@/api/auth";
import getCookie from "@/utils/getCookie";
import { createContext, useEffect, useState } from "react";

export interface User {
  userId: string;
  username: string;
  email: string;
}

interface AuthContext {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const AuthContext = createContext<AuthContext>({
  user: null,
  setUser: () => {},
});

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    async function getUserData() {
      const data = await getUser();
      if (data.user) setUser(data.user);
      else console.error(data.error);
    }
    const sessionToken = getCookie("sessionToken");
    if (sessionToken) {
      getUserData();
    }
  }, []);
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
