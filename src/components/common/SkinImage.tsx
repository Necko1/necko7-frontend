import { useState } from "react";
import { config } from "@/config";

// Direct CDN URL for <img> display
function getSkinImageUrl(marketItemName: string, size: 150 | 300 = 150): string {
  return `https://cdn2.csgo.com/item/${encodeURIComponent(marketItemName)}/${size}.png`;
}

// Proxied URL for canvas pixel access
function getSkinImageUrlProxied(marketItemName: string, size: 150 | 300 = 150): string {
  const cdnUrl = getSkinImageUrl(marketItemName, size);
  const base = config.API_BASE_URL.replace(/\/$/, "");
  return `${base}/api/v1/proxy/image?url=${encodeURIComponent(cdnUrl)}`;
}

// Fallback icon for when no skin image is available or on error
export function SkinFallbackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" rx="1" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

interface SkinImageProps {
  marketItemName: string | null | undefined;
  size?: 150 | 300;
  className?: string;
  fallbackClassName?: string;
  useProxy?: boolean;
}

/**
 * Renders a CS skin icon with a graceful fallback (gift icon) when:
 * - marketItemName is null/undefined
 * - The image fails to load
 */
export default function SkinImage({
  marketItemName,
  size = 150,
  className = "w-full h-full object-contain",
  fallbackClassName,
  useProxy = false,
}: SkinImageProps) {
  const [error, setError] = useState(false);

  if (!marketItemName || error) {
    return (
      <div
        className={
          fallbackClassName ??
          "w-full h-full flex items-center justify-center bg-muted/30"
        }
      >
        <SkinFallbackIcon className="w-1/2 h-1/2 text-muted-foreground/40" />
      </div>
    );
  }

  const src = useProxy
    ? getSkinImageUrlProxied(marketItemName, size)
    : getSkinImageUrl(marketItemName, size);

  return (
    <img
      src={src}
      alt={marketItemName}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
