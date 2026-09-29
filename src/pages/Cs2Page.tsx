import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { cs2Api, type Cs2PairingCode } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { isAxiosError } from "axios";
import { formatDistanceToNow } from "date-fns";
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
  const modal = useScriptDialog();
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [openFeedback, setOpenFeedback] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState("");
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
      ? "CS2 pairing is being refreshed. Wait ten seconds and retry."
      : responseStatus === 401
        ? "Your session expired. Sign in again to manage CS2 Integration."
        : responseStatus === 403
          ? "Only the channel owner can manage CS2 Integration."
          : "Unable to update CS2 Integration. Check your connection and retry.";
  const error = status.isError || (!device && pairing.isError) || unpairError;
  async function retry() {
    setUnpairError(false);
    const current = await status.refetch({ cancelRefetch: false });
    if (current.isSuccess) setCheckFeedback(current.data.device ? "Desktop connected." : "No desktop connected yet. Open the app or enter the code manually.");
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
        {status.isLoading && <p role="status">Loading integration…</p>}
        {error && (
          <div role="alert" className="space-y-3">
            <p>
              {unpairError
                ? "Unable to unpair the CS2 desktop. Check your connection and retry."
                : errorText}
            </p>
            <Button
              variant="outline"
              disabled={status.isFetching || pairing.isFetching}
              onClick={() => void retry()}
            >
              Retry
            </Button>
          </div>
        )}
        {device ? (
          <>
            <div className="grid gap-5 md:grid-cols-[minmax(160px,1fr)_minmax(240px,2fr)]">
              <div>
                <h2 className="text-xl font-semibold">Paired</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  CS2 desktop companion
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Version {device.app_version}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm">
                  Desktop:{" "}
                  {device.last_heartbeat_at
                    ? now - Date.parse(device.last_heartbeat_at) < 120_000
                      ? "Online"
                      : "Offline (heartbeat overdue)"
                    : "Status not yet checked"}
                </p>
                <p className="text-sm">
                  CS2 data:{" "}
                  {device.last_seen_at &&
                  now - Date.parse(device.last_seen_at) < 60_000
                    ? "Receiving CS2 data"
                    : "Waiting for CS2"}
                </p>
                {device.last_seen_at && (
                  <p className="text-sm text-muted-foreground">
                    Last received{" "}
                    {formatDistanceToNow(new Date(device.last_seen_at), {
                      addSuffix: true,
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
                  title: "Unpair desktop?",
                  description:
                    "This device will stop forwarding CS2 events for your channel. You can pair it again with a new code.",
                  submit: "Unpair desktop",
                  destructive: true,
                  onSubmit: () => unpair.mutateAsync(),
                })
              }
            >
              {unpair.isPending ? "Unpairing…" : "Unpair desktop"}
            </Button> : <p className="text-sm text-muted-foreground">Desktop pairing is managed by the channel owner.</p>}
          </>
        ) : (
          status.data && (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Connect your CS2 desktop</h2>
                <p className="text-sm text-muted-foreground">{owner ? "Open the companion to connect this channel. Keep CS2 running for game updates." : "Desktop pairing is managed by the channel owner."}</p>
              </div>
              {owner && <div className="cs2-pairing-flow">
              {remaining > 0 && code ? (
                <>
                  <div className="cs2-pairing-code">
                  <div>
                  <h3 className="text-xs text-muted-foreground mb-2">Pairing code</h3>
                  <p
                    className="font-mono text-3xl"
                    aria-label="Pairing code"
                  >
                    {code.code}
                  </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Expires in{" "}
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
                    Open CS2 Integration
                  </a>
                  <Button variant="outline" disabled={status.isFetching} onClick={() => void retry()}><HugeiconsIcon icon={RefreshIcon} size={16} />Check connection</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You can also enter this code in the desktop app.
                  </p>
                  {openFeedback && <p role="status" className="text-sm text-muted-foreground">Your browser may ask to open necko7 CS2. If nothing opens, install the app below, then enter this code. This page updates when pairing completes.</p>}
                  {checkFeedback && <p role="status" className="text-sm">{checkFeedback}</p>}
                </>
              ) : (
                !pairing.isError && (
                  <p role="status">
                    {code
                      ? "Pairing code expired. Refreshing…"
                      : "Creating pairing code…"}
                  </p>
                )
              )}
              </div>}
            </>
          )
        )}
        {!device && (
          <div className="cs2-install-flow">
          <div><h3 className="text-sm font-medium">Need the companion?</h3><p className="text-sm text-muted-foreground mt-1">Install necko7 CS2 for Windows, then return here to connect.</p></div>
          <a
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-foreground"
            href={download}
          >
            <HugeiconsIcon icon={Download01Icon} size={16} />
            Download desktop app
          </a>
          </div>
        )}
      </section>
      {modal.dialog}
    </div>
  );
}
