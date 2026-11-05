import { useState } from "preact/hooks";

interface DepartureImageProps {
  imageUrl: string | null;
  vehicleName: string;
}

function httpsImageUrl(value: string | null): string | null {
  if (value === null) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function CarPlaceholder({ vehicleName }: Pick<DepartureImageProps, "vehicleName">) {
  return <div class="departure-image-frame departure-image-placeholder"
    role="img" aria-label={`${vehicleName} image unavailable`}>
    <svg class="departure-placeholder-icon" viewBox="0 0 64 32" aria-hidden="true">
      <path d="M12 22h-4v-7l6-2 6-8h24l7 8 5 2v7h-4a7 7 0 0 1-14 0H26a7 7 0 0 1-14 0Zm5 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm24 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM22 9l-3 4h27l-4-4H22Z" />
    </svg>
  </div>;
}

export function DepartureImage(props: DepartureImageProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = httpsImageUrl(props.imageUrl);
  if (imageUrl === null || imageUrl === failedUrl) {
    return <CarPlaceholder vehicleName={props.vehicleName} />;
  }
  return <div class="departure-image-frame">
    <img class="departure-image" src={imageUrl} alt={props.vehicleName} loading="lazy"
      width="120" height="80" onError={() => setFailedUrl(imageUrl)} />
  </div>;
}
