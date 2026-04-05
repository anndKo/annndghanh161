import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/untypedClient';

type AppRole = 'admin' | 'tutor' | 'student';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  fullName: string | null;
  loading: boolean;
  isDeleted: boolean;
  signUp: (email: string, password: string, fullName: string, role?: AppRole) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      const [roleResult, profileResult, deletedResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).single(),
        supabase.from('profiles').select('full_name').eq('user_id', userId).single(),
        supabase.from('deleted_accounts').select('id').eq('user_id', userId).limit(1),
      ]);
      
      const deleted = deletedResult.data && deletedResult.data.length > 0;
      setIsDeleted(deleted);
      
      if (deleted) {
        setRole(null);
        setFullName(null);
        return;
      }
      
      setRole(roleResult.error ? null : (roleResult.data?.role as AppRole || null));
      setFullName(profileResult.error ? null : (profileResult.data?.full_name || null));
    } catch (error) {
      console.error('Error fetching user data:', error);
      setRole(null);
      setFullName(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setFullName(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role?: AppRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role || 'student',
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setFullName(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, fullName, loading, isDeleted, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
