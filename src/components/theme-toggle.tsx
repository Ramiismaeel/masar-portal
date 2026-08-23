"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sun, Moon } from "lucide-react";

import { setTheme } from "@/lib/actions/theme";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/theme";

/**
 * Same "cookie + Server Action + router.refresh()" shape as LocaleSwitcher.
 *
 * Two presentations of the same toggle, not two components — the state and
 * the Server Action call only need to exist once. `"icon"` (default) is the
 * compact header button used on the home/auth pages and the (app) header's
 * desktop row; `"menu-item"` is a full-width labelled row for the (app)
 * header's mobile drawer, where an icon-only button would be the only
 * unlabelled item among text rows.
 */
export function ThemeToggle({
  theme,
  variant = "icon",
}: {
  theme: Theme;
  variant?: "icon" | "menu-item";
}) {
  const t = useTranslations("ThemeToggle");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next: Theme = theme === "light" ? "dark" : "light";

  const handleClick = () => {
    startTransition(async () => {
      await setTheme(next);
      router.refresh();
    });
  };

  if (variant === "menu-item") {
    return (
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={handleClick}
        className="w-full justify-start gap-2.5 px-3"
      >
        {theme === "light" ? (
          <Moon aria-hidden="true" />
        ) : (
          <Sun aria-hidden="true" />
        )}
        {theme === "light" ? t("switchToDark") : t("switchToLight")}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      disabled={isPending}
      onClick={handleClick}
      aria-label={t("label")}
    >
      {theme === "light" ? (
        <Moon aria-hidden="true" />
      ) : (
        <Sun aria-hidden="true" />
      )}
    </Button>
  );
}
