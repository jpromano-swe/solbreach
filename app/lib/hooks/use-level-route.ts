"use client";

import { useEffect, useMemo, useState } from "react";
import type { LevelId, LevelsView } from "../levels/course-status";

export type RootSection =
  | "levels"
  | "vulnerabilities"
  | "research-labs"
  | "profile"
  | "beta-access";

function isLevelView(value: string | null): value is LevelId {
  return (
    value === "level0" ||
    value === "level1" ||
    value === "level2" ||
    value === "level3"
  );
}

function getInitialRouteState(): {
  section: RootSection;
  view: LevelsView;
} {
  if (typeof window === "undefined") {
    return { section: "levels", view: "landing" };
  }

  const params = new URLSearchParams(window.location.search);
  const section = params.get("section");
  const level = params.get("level");

  if (
    section === "profile" ||
    section === "research-labs" ||
    section === "vulnerabilities" ||
    section === "beta-access"
  ) {
    return { section, view: "landing" };
  }

  if (level === "level0") {
    return { section: "levels", view: "level1" };
  }

  if (isLevelView(level)) {
    return { section: "levels", view: level };
  }

  return { section: "levels", view: "landing" };
}

function buildRouteUrl(section: RootSection, view: LevelsView) {
  const params = new URLSearchParams();

  if (section === "levels" && view !== "landing") {
    params.set("level", view);
  } else if (section !== "levels") {
    params.set("section", section);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function useLevelRoute() {
  const initialRouteState = useMemo(
    () => ({ section: "levels" as RootSection, view: "landing" as LevelsView }),
    []
  );
  const [hasHydratedRoute, setHasHydratedRoute] = useState(false);
  const [activeSection, setActiveSection] = useState<RootSection>(
    initialRouteState.section
  );
  const [activeLevelsView, setActiveLevelsView] = useState<LevelsView>(
    initialRouteState.view
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextState = getInitialRouteState();
      setActiveSection(nextState.section);
      setActiveLevelsView(nextState.view);
      setHasHydratedRoute(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hasHydratedRoute) return;

    const nextUrl = buildRouteUrl(activeSection, activeLevelsView);
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [activeLevelsView, activeSection, hasHydratedRoute]);

  useEffect(() => {
    const handlePopState = () => {
      const nextState = getInitialRouteState();
      setActiveSection(nextState.section);
      setActiveLevelsView(nextState.view);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return {
    activeLevelsView,
    activeSection,
    setActiveLevelsView,
    setActiveSection,
  };
}
