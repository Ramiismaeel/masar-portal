"use client";

import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { Menu, X, ShieldUser } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { Theme } from "@/lib/theme";

/**
 * The (app) header's mobile-only menu. Language stays directly in the
 * header on every breakpoint (Rami's call — it's a one-tap toggle used far
 * more often than the items below, and hiding it a tap deeper made it
 * harder to reach on the surface where it matters most: applicants reading
 * in their second language). Only sign out, dark mode, and the admin link
 * move into this slide-out panel below `sm`; the desktop row still renders
 * them inline (DashboardLayout).
 */
export function AppMobileMenu({
  isAdmin,
  theme,
}: {
  isAdmin: boolean;
  theme: Theme;
}) {
  const t = useTranslations("AppLayout");

  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={
          <Button variant="outline" size="icon" aria-label={t("menu")} className="sm:hidden" />
        }
      >
        <Menu className="size-4" aria-hidden="true" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200
            data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
        />
        <Dialog.Popup
          className="fixed inset-y-0 end-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1
            border-s border-border bg-card p-4 shadow-xl transition-transform duration-200
            data-[open]:translate-x-0
            data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full
            rtl:data-[starting-style]:-translate-x-full rtl:data-[ending-style]:-translate-x-full"
        >
          <div className="flex items-center justify-between pb-2">
            <Dialog.Title className="text-sm font-semibold text-foreground">
              {t("menu")}
            </Dialog.Title>
            <Dialog.Close
              render={<Button variant="ghost" size="icon-sm" aria-label={t("close")} />}
            >
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="flex flex-col items-stretch gap-1 pt-2">
            {/* A plain ghost row, not an outlined button — this is
                navigation, not an action, and shouldn't look like one. */}
            {isAdmin && (
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/admin" />}
                className="w-full justify-start gap-2.5 px-3"
              >
                <ShieldUser aria-hidden="true" />
                {t("admin")}
              </Button>
            )}

            <ThemeToggle theme={theme} variant="menu-item" />

            <div className="my-2 border-t border-border" />

            <SignOutButton className="w-full" />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
