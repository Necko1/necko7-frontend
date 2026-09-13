import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";

export default function PanelGuide({ userId, channelId, role, mobile, onStart }: { userId: string; channelId: string; role: string; mobile: boolean; onStart: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const instance = useRef<Driver | null>(null);
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  const storageKey = `necko7:guide:v1:${userId}:${channelId}:${role}`;
  const start = useCallback(() => {
    instance.current?.destroy();
    const small = window.matchMedia("(max-width: 767px)").matches;
    let completed = false;
    const save = () => { try { localStorage.setItem(storageKey, completed ? "completed" : "skipped"); } catch { /* Storage can be disabled; the guide still works. */ } };
    const steps = [
      { title: "welcome", description: "welcomeDesc" },
      { title: "tourMarket", description: "tourMarketDesc", target: "settings", route: `/broadcasters/${channelId}/settings` },
      { title: "tourRewards", description: "tourRewardsDesc", target: "rewards", route: "/rewards" },
      { title: "tourTransactions", description: "tourTransactionsDesc", target: "redemptions", route: "/redemptions" },
      { title: "tourHolds", description: "tourHoldsDesc", target: "holds", route: "/redemptions?status=MANUAL_HOLD" },
      { title: "tourLogs", description: "tourLogsDesc", target: "logs", route: "/logs" },
      { title: "tourEnd", description: "tourEndDesc", route: "/dashboard" },
    ];
    const tour = driver({
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      showProgress: true, allowClose: true, disableActiveInteraction: true,
      overlayOpacity: .55, stagePadding: 5, stageRadius: 6,
      popoverClass: "necko-guide", nextBtnText: t("ops.next"), prevBtnText: t("ops.previous"), doneBtnText: t("ops.done"),
      onPopoverRender: popover => {
        popover.closeButton.setAttribute("aria-label", t("ops.close"));
        popover.closeButton.title = t("ops.skip");
        const skip = document.createElement("button");
        skip.type = "button";
        skip.className = "driver-popover-close-btn guide-skip";
        skip.textContent = t("ops.skip");
        popover.footer.prepend(skip);
      },
      onDoneClick: () => { completed = true; save(); tour.destroy(); },
      onDestroyStarted: () => { save(); tour.destroy(); },
      onCloseClick: () => { save(); tour.destroy(); },
      onDestroyed: save,
      steps: steps.map(step => ({
        element: step.target ? (small ? '[data-tour="mobile-header"]' : `[data-tour="${step.target}"]`) : undefined,
        onHighlightStarted: () => { if (small && step.route) navigateRef.current(step.route); },
        popover: { title: t(`ops.${step.title}`), description: t(`ops.${step.description}`), side: small ? "bottom" : "right", align: "start" },
      })),
    });
    instance.current = tour;
    tour.drive();
  }, [channelId, storageKey, t]);

  useEffect(() => {
    // Only the persistent sidebar owns auto-start; the mobile sheet is transient.
    if (mobile) return;
    let seen = false;
    try { seen = !!localStorage.getItem(storageKey); } catch { /* optional persistence */ }
    const timeout = seen ? undefined : window.setTimeout(start, 900);
    return () => { window.clearTimeout(timeout); instance.current?.destroy(); };
  }, [mobile, storageKey, start]);

  return <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => {
    if (mobile) {
      // Let the modal restore focus before starting the tour from the persistent owner.
      onStart();
      window.setTimeout(() => document.querySelector<HTMLButtonElement>('[data-guide-launch="desktop"]')?.click(), 180);
    } else start();
  }} data-guide-launch={mobile ? "mobile" : "desktop"}><span className="flex size-4 items-center justify-center rounded-full border border-current text-[10px]" aria-hidden="true">?</span>{t("ops.guide")}</Button>;
}
