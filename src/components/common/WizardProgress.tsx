/** Shared with reward creation: numbered columns and the active accent line. */
export default function WizardProgress({ label, steps, current, onChange, isDisabled }: {
  label: string;
  steps: string[];
  current: number;
  onChange: (step: number) => void;
  isDisabled?: (step: number) => boolean;
}) {
  return <nav className="wizard-progress" aria-label={label}>
    {steps.map((title, index) => <button key={title} type="button"
      aria-current={current === index ? "step" : undefined}
      disabled={isDisabled?.(index)} onClick={() => onChange(index)}>
      <span>{String(index + 1).padStart(2, "0")}</span><span>{title}</span>
    </button>)}
  </nav>;
}
