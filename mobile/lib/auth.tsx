// Stato di autenticazione via React Context (pattern indicato dal brief).
// Il JWT è persistito in modo sicuro con expo-secure-store.

import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as api from "./api";

const TOKEN_KEY = "auth_token";

interface AuthState {
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    enrollmentCode?: string | null,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  // Cancella l'account lato server e scarta il token locale (diritto all'oblio).
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        setToken(stored);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (value: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, value);
    setToken(value);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const t = await api.login(email, password);
      await persist(t);
    },
    [persist],
  );

  const signUp = useCallback(
    async (email: string, password: string, enrollmentCode?: string | null) => {
      await api.register(email, password, enrollmentCode);
      const t = await api.login(email, password);
      await persist(t);
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    // Best-effort: disattiva le push e azzera la posizione lato server prima
    // di scartare il token (privacy: niente dati orfani dopo il logout).
    try {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) await api.clearPushToken(stored);
    } catch {
      // se la rete fallisce, procediamo comunque col logout locale
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    // A differenza del logout NON ingoiamo l'errore: se la cancellazione lato
    // server fallisce, l'utente deve saperlo (l'account resta attivo).
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    if (stored) await api.deleteAccount(stored);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ token, loading, signIn, signUp, signOut, deleteAccount }),
    [token, loading, signIn, signUp, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve stare dentro <AuthProvider>");
  return ctx;
}
