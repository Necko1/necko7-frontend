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
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Box bottom */}
      <path d="M4.5 9.5a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5v8a3 3 0 0 1-3 3H7.5a3 3 0 0 1-3-3v-8z" />
      {/* Ribbon vertical */}
      <path d="M12 8v13" />
      {/* Lid */}
      <rect x="3" y="6" width="18" height="3" rx="1.5" />
      {/* Ribbon bows */}
      <path d="M12 6C10.5 3.5 7.5 3.5 7.5 6s4.5 0 4.5 0z" />
      <path d="M12 6C13.5 3.5 16.5 3.5 16.5 6s-4.5 0-4.5 0z" />
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
          "w-full h-full flex items-center justify-center bg-primary/5"
        }
      >
        <SkinFallbackIcon className="w-14 h-14 text-primary" />
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
