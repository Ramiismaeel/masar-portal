"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sun, Moon } from "lucide-react";

import { setTheme } from "@/lib/actions/theme";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/theme";

/** Same "cookie + Server Action + router.refresh()" shape as LocaleSwitcher. */
export function ThemeToggle({ theme }: { theme: Theme }) {
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
