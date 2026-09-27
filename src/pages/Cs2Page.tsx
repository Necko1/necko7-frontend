import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { cs2Api, type Cs2PairingCode } from "@/lib/apiClient";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
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
  const [code, setCode] = useState<Cs2PairingCode | null>(null);
  const status = useQuery({ queryKey: ["cs2", channelId], queryFn: () => cs2Api.status(channelId).then(r => r.data), refetchInterval: 15_000 });
  const pairing = useMutation({ mutationFn: () => cs2Api.pairing(channelId).then(r => r.data), onSuccess: setCode });
  const unpair = useMutation({ mutationFn: () => cs2Api.unpair(channelId), onSuccess: async () => { setCode(null); pairing.reset(); await qc.invalidateQueries({ queryKey: ["cs2", channelId] }); } });
  const remaining = code ? Math.max(0, Math.ceil((Date.parse(code.expires_at) - now) / 1000)) : 0;
  const { mutate: requestCode, isPending: requestingCode, isError: codeError } = pairing;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (status.data && !status.data.device && !status.isError && !status.isFetching && remaining === 0 && !requestingCode && !codeError) requestCode();
  }, [status.data, status.isError, status.isFetching, remaining, requestingCode, codeError, requestCode]);
  const device = status.data?.device;
  const error = status.isError || pairing.isError || unpair.isError;
  const download = /^https:\/\//i.test(config.CS2_DOWNLOAD_URL) ? config.CS2_DOWNLOAD_URL : null;
  return <div className="page-shell space-y-6">
    <div><h1 className="text-3xl font-semibold">CS2 Integration</h1><p className="text-muted-foreground mt-2">Connect CS2 events from your matches with rewards for your viewers.</p></div>
    <section className="rounded-xl border border-border bg-card p-6 max-w-xl space-y-5">
      {status.isLoading && <p role="status">Loading integration…</p>}
      {error && <div role="alert" className="space-y-3"><p>Unable to update CS2 Integration. Please try again.</p><Button variant="outline" onClick={() => { pairing.reset(); unpair.reset(); void status.refetch(); }}>Retry</Button></div>}
      {device ? <>
        <h2 className="text-xl font-semibold">Paired</h2>
        <p>{device.last_seen_at && now - Date.parse(device.last_seen_at) < 90_000 ? "Desktop recently connected" : "Waiting for desktop GSI"}</p>
        {device.last_seen_at && <p className="text-sm text-muted-foreground">Last connected: {new Date(device.last_seen_at).toLocaleString()}</p>}
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
      {download ? <a className="block text-primary underline" href={download}>Download desktop app</a> : <p className="text-sm text-muted-foreground">Desktop download will be available when the Windows release is published.</p>}
    </section>
    <section className="max-w-xl rounded-xl border border-border p-6"><h2 className="font-semibold">Coming soon</h2><p className="text-sm text-muted-foreground mt-2">CS2 event rewards and configuration.</p></section>
  </div>;
}
