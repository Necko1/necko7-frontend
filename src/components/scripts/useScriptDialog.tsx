import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "./data";

type Field = {
  name: string;
  label: string;
  value?: string;
  multiline?: boolean;
  inputType?: "number";
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  validate?: (value: string, values: Record<string, string>) => string | undefined;
};
export type DialogRequest = {
  title: string;
  description: string;
  submit: string;
  destructive?: boolean;
  fields?: Field[];
  onSubmit: (values: Record<string, string>) => Promise<unknown> | void;
};
export function useScriptDialog() {
  const { t } = useTranslation();
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (error && !pending) {
      formRef.current
        ?.querySelector<HTMLElement>("input,textarea,button[type=submit]")
        ?.focus();
    }
  }, [error, pending]);
  const show = useCallback((next: DialogRequest) => {
    setValues(
      Object.fromEntries(
        (next.fields ?? []).map((f) => [f.name, f.value ?? ""]),
      ),
    );
    setError("");
    setRequest(next);
  }, []);
  const dialog = (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open && !pending) setRequest(null);
      }}
    >
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          <DialogDescription>{request?.description}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!request || submitting.current) return;
            const invalid = request.fields
              ?.map((f) => f.validate?.(values[f.name] ?? "", values))
              .find(Boolean);
            if (invalid) {
              setError(invalid);
              return;
            }
            submitting.current = true;
            setPending(true);
            setError("");
            try {
              await request.onSubmit(values);
              setRequest(null);
            } catch (error) {
              setError(errorText(error));
            } finally {
              submitting.current = false;
              setPending(false);
            }
          }}
          ref={formRef}
          className="space-y-4"
        >
          {request?.fields?.map((field, i) => (
            <label key={field.name} className="block space-y-2">
              <span>{field.label}</span>
              {field.multiline ? (
                <Textarea
                  autoFocus={i === 0}
                  aria-label={field.label}
                  value={values[field.name]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  rows={7}
                  disabled={pending}
                  className="font-mono"
                />
              ) : (
                <Input
                  type={field.inputType ?? "text"}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  autoFocus={i === 0}
                  aria-label={field.label}
                  value={values[field.name]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.value }))
                  }
                  disabled={pending}
                />
              )}
              {field.description && <span className="block text-xs text-muted-foreground">{field.description}</span>}
            </label>
          ))}
          {error && (
            <p role="alert" className="text-destructive break-words">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setRequest(null)}
            >
              {t("scripts.cancel")}
            </Button>
            <Button
              type="submit"
              variant={request?.destructive ? "destructive" : "default"}
              disabled={pending}
            >
              {pending ? t("scripts.working") : request?.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
  return { show, dialog };
}
