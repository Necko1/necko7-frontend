import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { cs2Api, type Cs2PairingCode } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { isAxiosError } from "axios";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { config } from "@/config";
import { useScriptDialog } from "@/components/scripts/useScriptDialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, Link01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import "@/components/scripts/scripts.css";

export default function Cs2Page() {
  const { selectedBroadcasterId, broadcasters } = useAppStore();
  const channel = broadcasters.find(
    (b) => b.channel_id === selectedBroadcasterId,
  );
  if (!channel || !["OWNER", "EDITOR"].includes(channel.role.toUpperCase()))
    return <Navigate to="/channels" replace />;
  return (
    <Cs2Integration key={`${channel.channel_id}-${channel.role}`} channelId={channel.channel_id} owner={channel.role.toUpperCase() === "OWNER"} />
  );
}

function Cs2Integration({ channelId, owner }: { channelId: string; owner: boolean }) {
  const { t, i18n } = useTranslation();
  const modal = useScriptDialog();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [openFeedback, setOpenFeedback] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<"connected" | "waitingDesktop" | null>(null);
  const statusKey = ["cs2", channelId];
  const codeKey = ["cs2-code", channelId];
  const status = useQuery({
    queryKey: statusKey,
    queryFn: () => cs2Api.status(channelId).then((r) => r.data),
    staleTime: 0,
    refetchInterval: 15_000,
  });
  const pairing = useQuery({
    queryKey: codeKey,
    enabled: owner && status.isSuccess && !status.data.device,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (count, error) =>
      isAxiosError(error) && error.response?.status === 429 && count < 1,
    retryDelay: 10_000,
    queryFn: async (): Promise<Cs2PairingCode | null> => {
      // Reconcile before rotating: a desktop may have consumed the previous code.
      const current = (await cs2Api.status(channelId)).data;
      qc.setQueryData(statusKey, current);
      if (current.device) return null;
      try {
        return (await cs2Api.pairing(channelId)).data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 400) {
          const latest = (await cs2Api.status(channelId)).data;
          qc.setQueryData(statusKey, latest);
          if (latest.device) return null;
        }
        throw error;
      }
    },
  });
  const [unpairError, setUnpairError] = useState(false);
  const unpair = useMutation({
    mutationFn: () => cs2Api.unpair(channelId),
    onError: () => setUnpairError(true),
    onSuccess: async () => {
      setUnpairError(false);
      qc.setQueryData(codeKey, null);
      await qc.invalidateQueries({ queryKey: statusKey });
    },
  });
  const code = pairing.data;
  const remaining = code
    ? Math.max(0, Math.ceil((Date.parse(code.expires_at) - now) / 1000))
    : 0;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const {
    refetch: refetchCode,
    isFetching: codeFetching,
    isError: codeFailed,
  } = pairing;
  useEffect(() => {
    if (
      owner && status.isSuccess &&
      !status.data.device &&
      remaining === 0 &&
      !codeFetching &&
      !codeFailed
    )
      void refetchCode({ cancelRefetch: false });
  }, [
    status.isSuccess,
    status.data,
    remaining,
    codeFetching,
    codeFailed,
    refetchCode,
    owner,
  ]);
  const device = status.data?.device;
  const deviceId = device?.id;
  useEffect(() => {
    if (deviceId) qc.setQueryData(["cs2-code", channelId], null);
  }, [deviceId, qc, channelId]);

  const requestError = status.error ?? pairing.error;
  const responseStatus = isAxiosError(requestError)
    ? requestError.response?.status
    : undefined;
  const errorText =
    responseStatus === 429
      ? t("scripts.pairingRefreshing")
      : responseStatus === 401
        ? t("scripts.sessionExpired")
        : responseStatus === 403
          ? t("scripts.ownerOnly")
          : t("scripts.cs2UpdateFailed");
  const error = status.isError || (!device && pairing.isError) || unpairError;
  async function retry() {
    setUnpairError(false);
    const current = await status.refetch({ cancelRefetch: false });
    if (current.isSuccess) setCheckFeedback(current.data.device ? "connected" : "waitingDesktop");
    if (
      owner && current.isSuccess &&
      !current.data.device &&
      (!code || Date.parse(code.expires_at) <= Date.now() || pairing.isError)
    )
      await pairing.refetch({ cancelRefetch: false });
  }
  const download = /^https:\/\//i.test(config.CS2_DOWNLOAD_URL)
    ? config.CS2_DOWNLOAD_URL
    : "https://github.com/Necko1/necko7-cs2i/releases/latest/download/necko7-cs2i-windows-x64-setup.exe";
  return (
    <div className="space-y-6">
      <section className="border-y border-border py-6 space-y-5">
        {status.isLoading && <p role="status">{t("scripts.loadingIntegration")}</p>}
        {error && (
          <div role="alert" className="space-y-3">
            <p>
              {unpairError
                ? t("scripts.unpairFailed")
                : errorText}
            </p>
            <Button
              variant="outline"
              disabled={status.isFetching || pairing.isFetching}
              onClick={() => void retry()}
            >
              {t("scripts.retry")}
            </Button>
          </div>
        )}
        {device ? (
          <>
            <div className="grid gap-5 md:grid-cols-[minmax(160px,1fr)_minmax(240px,2fr)]">
              <div>
                <h2 className="text-xl font-semibold">{t("scripts.paired")}</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("scripts.companion")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("scripts.version")} {device.app_version}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm">
                  {t("scripts.desktopLabel")}{" "}
                  {device.last_heartbeat_at
                    ? now - Date.parse(device.last_heartbeat_at) < 120_000
                      ? t("scripts.desktopOnline")
                      : t("scripts.offline")
                    : t("scripts.unchecked")}
                </p>
                <p className="text-sm">
                  {t("scripts.cs2Data")}{" "}
                  {device.last_seen_at &&
                  now - Date.parse(device.last_seen_at) < 60_000
                    ? t("scripts.receivingCs2")
                    : t("scripts.waitingCs2")}
                </p>
                {device.last_seen_at && (
                  <p className="text-sm text-muted-foreground">
                    {t("scripts.lastReceived")}{" "}
                    {formatDistanceToNow(new Date(device.last_seen_at), {
                      addSuffix: true,
                      locale: i18n.language.startsWith("ru") ? ru : enUS,
                    })}
                  </p>
                )}
              </div>
            </div>
            {owner ? <Button
              variant="outline"
              disabled={unpair.isPending}
              onClick={() =>
                modal.show({
                  title: t("scripts.unpairTitle"),
                  description:
                    t("scripts.unpairDescription"),
                  submit: t("scripts.unpair"),
                  destructive: true,
                  onSubmit: () => unpair.mutateAsync(),
                })
              }
            >
              {unpair.isPending ? t("scripts.unpairing") : t("scripts.unpair")}
            </Button> : <p className="text-sm text-muted-foreground">{t("scripts.ownerManagesPairing")}</p>}
          </>
        ) : (
          status.data && (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{t("scripts.connectDesktop")}</h2>
                <p className="text-sm text-muted-foreground">{owner ? t("scripts.connectDesktopDescription") : t("scripts.ownerManagesPairing")}</p>
              </div>
              {owner && <div className="cs2-pairing-flow">
              {remaining > 0 && code ? (
                <>
                  <div className="cs2-pairing-code">
                  <div>
                  <h3 className="text-xs text-muted-foreground mb-2">{t("scripts.pairingCode")}</h3>
                  <p
                    className="font-mono text-3xl"
                    aria-label={t("scripts.pairingCode")}
                  >
                    {code.code}
                  </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("scripts.expiresIn")}{" "}
                    {Math.floor(remaining / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(remaining % 60).toString().padStart(2, "0")}
                  </p>
                  </div>
                  <div className="cs2-pairing-actions">
                  <a
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground"
                    href={`necko7-cs2i://pair?code=${encodeURIComponent(code.code)}`}
                    onClick={() => setOpenFeedback(true)}
                  >
                    <HugeiconsIcon icon={Link01Icon} size={16} />
                    {t("scripts.openCs2")}
                  </a>
                  <Button variant="outline" disabled={status.isFetching} onClick={() => void retry()}><HugeiconsIcon icon={RefreshIcon} size={16} />{t("scripts.checkConnection")}</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("scripts.manualPairing")}
                  </p>
                  {openFeedback && <p role="status" className="text-sm text-muted-foreground">{t("scripts.openFeedback")}</p>}
                  {checkFeedback && <p role="status" className="text-sm">{t(`scripts.${checkFeedback}`)}</p>}
                </>
              ) : (
                !pairing.isError && (
                  <p role="status">
                    {code
                      ? t("scripts.codeExpired")
                      : t("scripts.creatingCode")}
                  </p>
                )
              )}
              </div>}
            </>
          )
        )}
        {!device && (
          <div className="cs2-install-flow">
          <div><h3 className="text-sm font-medium">{t("scripts.needCompanion")}</h3><p className="text-sm text-muted-foreground mt-1">{t("scripts.installDescription")}</p></div>
          <a
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-foreground"
            href={download}
          >
            <HugeiconsIcon icon={Download01Icon} size={16} />
            {t("scripts.downloadDesktop")}
          </a>
          </div>
        )}
      </section>
      {modal.dialog}
    </div>
  );
}
