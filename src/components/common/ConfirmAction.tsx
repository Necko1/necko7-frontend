import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmAction({ open, onClose, onConfirm, title, description, label, pending, destructive = false, context }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string;
  label: string; pending?: boolean; destructive?: boolean; context?: string;
}) {
  const { t } = useTranslation();
  return <Dialog open={open} onOpenChange={(value) => { if (!value && !pending) onClose(); }}>
    <DialogContent showCloseButton={!pending}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      {context && <p className="rounded-md bg-muted p-3 text-sm break-words whitespace-pre-line">{context}</p>}
      <DialogFooter><Button autoFocus variant="outline" disabled={pending} onClick={onClose}>{t("common.cancel")}</Button><Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={onConfirm}>{pending ? t("ops.working") : label}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
