import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { cs2Api, type Cs2PairingCode } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { isAxiosError } from "axios";
import { formatDistanceToNow } from "date-fns";
import { config } from "@/config";

export default function Cs2Page() {
  const { selectedBroadcasterId, broadcasters } = useAppStore();
  const channel = broadcasters.find(b => b.channel_id === selectedBroadcasterId);
  if (channel?.role.toUpperCase() !== "OWNER") return <Navigate to="/channels" replace />;
  return <Cs2Integration key={channel.channel_id} channelId={channel.channel_id} />;
}

function Cs2Integration({ channelId }: { channelId: string }) {
  const qc = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const statusKey = ["cs2", channelId];
  const codeKey = ["cs2-code", channelId];
  const status = useQuery({ queryKey: statusKey, queryFn: () => cs2Api.status(channelId).then(r => r.data), staleTime: 0, refetchInterval: 15_000 });
  const pairing = useQuery({
    queryKey: codeKey,
    enabled: status.isSuccess && !status.data.device,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (count, error) => isAxiosError(error) && error.response?.status === 429 && count < 1,
    retryDelay: 10_000,
    queryFn: async (): Promise<Cs2PairingCode | null> => {
      // Reconcile before rotating: a desktop may have consumed the previous code.
      const current = (await cs2Api.status(channelId)).data;
      qc.setQueryData(statusKey, current);
      if (current.device) return null;
      try { return (await cs2Api.pairing(channelId)).data; }
      catch (error) {
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
  const remaining = code ? Math.max(0, Math.ceil((Date.parse(code.expires_at) - now) / 1000)) : 0;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const { refetch: refetchCode, isFetching: codeFetching, isError: codeFailed } = pairing;
  useEffect(() => {
    if (status.isSuccess && !status.data.device && remaining === 0 && !codeFetching && !codeFailed) void refetchCode({ cancelRefetch: false });
  }, [status.isSuccess, status.data, remaining, codeFetching, codeFailed, refetchCode]);
  const device = status.data?.device;
  const deviceId = device?.id;
  useEffect(() => {
    if (deviceId) qc.setQueryData(["cs2-code", channelId], null);
  }, [deviceId, qc, channelId]);

  const requestError = status.error ?? pairing.error;
  const responseStatus = isAxiosError(requestError) ? requestError.response?.status : undefined;
  const errorText = responseStatus === 429 ? "CS2 pairing is being refreshed. Wait ten seconds and retry."
    : responseStatus === 401 ? "Your session expired. Sign in again to manage CS2 Integration."
    : responseStatus === 403 ? "Only the channel owner can manage CS2 Integration."
    : "Unable to update CS2 Integration. Check your connection and retry.";
  const error = status.isError || (!device && pairing.isError) || unpairError;
  async function retry() {
    setUnpairError(false);
    const current = await status.refetch({ cancelRefetch: false });
    if (current.isSuccess && !current.data.device && (!code || Date.parse(code.expires_at) <= Date.now() || pairing.isError)) await pairing.refetch({ cancelRefetch: false });
  }
  const download = /^https:\/\//i.test(config.CS2_DOWNLOAD_URL) ? config.CS2_DOWNLOAD_URL : "https://github.com/Necko1/necko7-cs2i/releases/latest/download/necko7-cs2i-windows-x64-setup.exe";
  return <div className="page-shell space-y-6">
    <div><h1 className="text-3xl font-semibold">CS2 Integration</h1><p className="text-muted-foreground mt-2">Connect CS2 events from your matches with rewards for your viewers.</p></div>
    <section className="rounded-xl border border-border bg-card p-6 w-full max-w-xl mx-auto space-y-5">
      {status.isLoading && <p role="status">Loading integration…</p>}
      {error && <div role="alert" className="space-y-3"><p>{unpairError ? "Unable to unpair the CS2 desktop. Check your connection and retry." : errorText}</p><Button variant="outline" disabled={status.isFetching || pairing.isFetching} onClick={() => void retry()}>Retry</Button></div>}
      {device ? <>
        <h2 className="text-xl font-semibold">Paired</h2>
        <p>Desktop: {device.last_heartbeat_at ? (now - Date.parse(device.last_heartbeat_at) < 120_000 ? "Online" : "Offline (heartbeat overdue)") : "Status not yet checked"}</p>
        <p>CS2 data: {device.last_seen_at && now - Date.parse(device.last_seen_at) < 90_000 ? "Receiving CS2 data" : "Waiting for CS2"}</p>
        {device.last_seen_at && <p className="text-sm text-muted-foreground">Last received {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}</p>}
        <p className="text-sm text-muted-foreground">Desktop version {device.app_version}</p>
        <Button variant="outline" disabled={unpair.isPending} onClick={() => unpair.mutate()}>{unpair.isPending ? "Unpairing…" : "Unpair desktop"}</Button>
      </> : status.data && <>
        <h2 className="text-lg font-semibold">Pairing code</h2>
        {remaining > 0 && code ? <>
          <p className="rounded-lg border border-border bg-background p-5 font-mono text-3xl tracking-widest text-center" aria-label="Pairing code">{code.code}</p>
          <p className="text-sm text-muted-foreground">Expires in {Math.floor(remaining / 60).toString().padStart(2, "0")}:{(remaining % 60).toString().padStart(2, "0")}</p>
          <a className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground" href={`necko7-cs2i://pair?code=${encodeURIComponent(code.code)}`}>Open CS2 Integration</a>
          <p className="text-sm text-muted-foreground">Or enter this code in the desktop app.</p>
        </> : !pairing.isError && <p role="status">{code ? "Pairing code expired. Refreshing…" : "Creating pairing code…"}</p>}
      </>}
      <a className="inline-flex rounded-md border border-border px-4 py-2 text-primary" href={download}>Download desktop app</a>
      {!error && !device && <Button variant="outline" disabled={status.isFetching || pairing.isFetching} onClick={() => void retry()}>Retry</Button>}
    </section>
  </div>;
}
