export function openNativePicker(input: HTMLInputElement): void {
  try {
    if (input.showPicker === undefined) {
      input.focus();
      return;
    }
    input.showPicker();
  } catch {
    input.focus();
  }
}
