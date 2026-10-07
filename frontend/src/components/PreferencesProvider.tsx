"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, updateMe } from "@/lib/api";
import { ALL_MODULES, ModuleId } from "@/lib/nav";
import { DEFAULT_UPGRADE_URL, Entitlements, PlanId, UNKNOWN_ENTITLEMENTS } from "@/lib/plans";

interface Preferences {
  /** False until the user's choices have loaded; everything shows in the meantime. */
  loaded: boolean;
  /** Modules shown: the ones the user chose that their plan includes. */
  modules: ModuleId[];
  /** Modules the user chose, whether or not their plan includes them. */
  chosenModules: ModuleId[];
  /** Whether the user's plan includes a module. */
  canUse: (module: ModuleId) => boolean;
  plan: PlanId;
  planExpiresAt: string | null;
  planSource: string | null;
  /** A paid plan that has ended (the account is back on Free). */
  expiredPlan: PlanId | null;
  entitlements: Entitlements;
  upgradeUrl: string;
  onboarded: boolean;
  name: string;
  save: (changes: { modules?: ModuleId[]; onboarded?: true }) => Promise<void>;
  /** Open the welcome walkthrough again (from Settings). */
  replayWelcome: () => void;
  welcomeOpen: boolean;
  closeWelcome: () => void;
  /** The on-screen tour that points at the real buttons, run after the welcome dialog. */
  tourOpen: boolean;
  startTour: () => void;
  endTour: () => void;
}

const PreferencesContext = createContext<Preferences | null>(null);

interface Me {
  modules: ModuleId[];
  onboarded: boolean;
  name?: string;
  plan: PlanId;
  planExpiresAt: string | null;
  planSource: string | null;
  expiredPlan: PlanId | null;
  entitlements: Entitlements;
  upgradeUrl: string | null;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [chosen, setChosen] = useState<ModuleId[]>(ALL_MODULES);
  const [onboarded, setOnboarded] = useState(true);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<Pick<Me, "plan" | "planExpiresAt" | "planSource" | "expiredPlan" | "entitlements" | "upgradeUrl">>({
    plan: "FREE",
    planExpiresAt: null,
    planSource: null,
    expiredPlan: null,
    entitlements: UNKNOWN_ENTITLEMENTS,
    upgradeUrl: null,
  });
  const [replaying, setReplaying] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const apply = useCallback((me: Me) => {
    setChosen(me.modules);
    setOnboarded(me.onboarded);
    setPlan({
      plan: me.plan,
      planExpiresAt: me.planExpiresAt,
      planSource: me.planSource,
      expiredPlan: me.expiredPlan,
      entitlements: me.entitlements ?? UNKNOWN_ENTITLEMENTS,
      upgradeUrl: me.upgradeUrl,
    });
  }, []);

  useEffect(() => {
    getMe()
      .then((me: Me) => {
        apply(me);
        setName(me.name ?? "");
      })
      // Without preferences the app still works with everything shown and no walkthrough.
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [apply]);

  const save = useCallback(
    async (changes: { modules?: ModuleId[]; onboarded?: true }) => {
      if (changes.modules) setChosen(changes.modules);
      if (changes.onboarded) setOnboarded(true);
      apply(await updateMe(changes));
    },
    [apply]
  );

  const canUse = useCallback((m: ModuleId) => plan.entitlements.modules.includes(m), [plan.entitlements]);

  return (
    <PreferencesContext.Provider
      value={{
        loaded,
        modules: chosen.filter(canUse),
        chosenModules: chosen,
        canUse,
        ...plan,
        upgradeUrl: plan.upgradeUrl || DEFAULT_UPGRADE_URL,
        onboarded,
        name,
        save,
        replayWelcome: () => setReplaying(true),
        welcomeOpen: (loaded && !onboarded) || replaying,
        closeWelcome: () => setReplaying(false),
        tourOpen,
        startTour: () => setTourOpen(true),
        endTour: () => setTourOpen(false),
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
