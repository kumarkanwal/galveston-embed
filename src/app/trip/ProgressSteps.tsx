const STEPS = ["Trip Details", "Choose Vehicle", "Confirm"];

interface ProgressStepsProps {
  activeStep?: 1 | 2 | 3;
}

export function ProgressSteps({ activeStep = 1 }: ProgressStepsProps) {
  return (
    <ol class="progress" aria-label="Booking progress">
      {STEPS.map((step, index) => (
        <li class={index + 1 === activeStep ? "active" : ""}
          aria-current={index + 1 === activeStep ? "step" : undefined}>
          <span>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
