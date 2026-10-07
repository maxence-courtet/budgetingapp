"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, updateMe } from "@/lib/api";
import { ALL_MODULES, ModuleId } from "@/lib/nav";

interface Preferences {
  /** False until the user's choices have loaded; everything shows in the meantime. */
  loaded: boolean;
  modules: ModuleId[];
  onboarded: boolean;
  name: string;
  save: (changes: { modules?: ModuleId[]; onboarded?: true }) => Promise<void>;
  /** Open the welcome walkthrough again (from Settings). */
  replayWelcome: () => void;
  welcomeOpen: boolean;
  closeWelcome: () => void;
}

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [modules, setModules] = useState<ModuleId[]>(ALL_MODULES);
  const [onboarded, setOnboarded] = useState(true);
  const [name, setName] = useState("");
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => {
        setModules(me.modules);
        setOnboarded(me.onboarded);
        setName(me.name ?? "");
      })
      // Without preferences the app still works with everything shown and no walkthrough.
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback(async (changes: { modules?: ModuleId[]; onboarded?: true }) => {
    if (changes.modules) setModules(changes.modules);
    if (changes.onboarded) setOnboarded(true);
    const me = await updateMe(changes);
    setModules(me.modules);
    setOnboarded(me.onboarded);
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        loaded,
        modules,
        onboarded,
        name,
        save,
        replayWelcome: () => setReplaying(true),
        welcomeOpen: (loaded && !onboarded) || replaying,
        closeWelcome: () => setReplaying(false),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
