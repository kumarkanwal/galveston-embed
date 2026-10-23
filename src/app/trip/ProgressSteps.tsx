const DEFAULT_STEPS = ["Trip Details", "Choose Vehicle", "Confirm"];

interface ProgressStepsProps {
  activeStep?: 1 | 2 | 3;
  complete?: boolean;
  steps?: string[];
}

export function ProgressSteps({
  activeStep = 1,
  complete = false,
  steps = DEFAULT_STEPS,
}: ProgressStepsProps) {
  return (
    <ol class="progress" aria-label={complete ? "Booking progress, completed" : "Booking progress"}>
      {steps.map((step, index) => (
        <li class={complete || index + 1 <= activeStep ? "active" : ""}
          aria-label={complete ? `${step}, completed` : undefined}
          aria-current={!complete && index + 1 === activeStep ? "step" : undefined}>
          <span class="step-number" aria-hidden="true">{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
