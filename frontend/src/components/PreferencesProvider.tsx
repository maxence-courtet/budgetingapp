"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, updateMe } from "@/lib/api";
import { ALL_MODULES, ModuleId } from "@/lib/nav";
import { DEFAULT_WEBSITE_URL, Entitlements, PlanId, UNKNOWN_ENTITLEMENTS } from "@/lib/plans";

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
  /** The account is in its free trial (until planExpiresAt). */
  trial: boolean;
  trialDays: number;
  entitlements: Entitlements;
  upgradeUrl: string;
  /** The public website: guides and legal pages. */
  websiteUrl: string;
  healthConsentAt: string | null;
  setHealthConsent: (given: boolean) => Promise<void>;
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
  trial: boolean;
  trialDays: number;
  entitlements: Entitlements;
  upgradeUrl: string | null;
  websiteUrl: string | null;
  healthConsentAt: string | null;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [chosen, setChosen] = useState<ModuleId[]>(ALL_MODULES);
  const [onboarded, setOnboarded] = useState(true);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<
    Pick<Me, "plan" | "planExpiresAt" | "planSource" | "trial" | "trialDays" | "entitlements" | "upgradeUrl" | "websiteUrl" | "healthConsentAt">
  >({
    plan: "PLUS",
    planExpiresAt: null,
    planSource: null,
    trial: false,
    trialDays: 30,
    entitlements: UNKNOWN_ENTITLEMENTS,
    upgradeUrl: null,
    websiteUrl: null,
    healthConsentAt: null,
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
      trial: me.trial,
      trialDays: me.trialDays,
      entitlements: me.entitlements ?? UNKNOWN_ENTITLEMENTS,
      upgradeUrl: me.upgradeUrl,
      websiteUrl: me.websiteUrl,
      healthConsentAt: me.healthConsentAt,
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

  const setHealthConsent = useCallback(async (given: boolean) => apply(await updateMe({ healthConsent: given })), [apply]);

  const canUse = useCallback((m: ModuleId) => plan.entitlements.modules.includes(m), [plan.entitlements]);

  return (
    <PreferencesContext.Provider
      value={{
        loaded,
        modules: chosen.filter(canUse),
        chosenModules: chosen,
        canUse,
        ...plan,
        upgradeUrl: plan.upgradeUrl || `${plan.websiteUrl || DEFAULT_WEBSITE_URL}/pricing/`,
        websiteUrl: plan.websiteUrl || DEFAULT_WEBSITE_URL,
        setHealthConsent,
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
