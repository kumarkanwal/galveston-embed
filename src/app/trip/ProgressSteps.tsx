const STEPS = ["Trip Details", "Choose Vehicle", "Confirm"];

export function ProgressSteps() {
  return (
    <ol class="progress" aria-label="Booking progress">
      {STEPS.map((step, index) => (
        <li class={index === 0 ? "active" : ""} aria-current={index === 0 ? "step" : undefined}>
          <span>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
