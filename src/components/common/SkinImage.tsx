import { useState } from "react";
import { config } from "@/config";
import { HugeiconsIcon } from "@hugeicons/react";
import { GiftIcon } from "@hugeicons/core-free-icons";

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
export function SkinFallbackIcon({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <HugeiconsIcon
      icon={GiftIcon}
      size={size}
      strokeWidth={1.5}
      className={className}
    />
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
        <SkinFallbackIcon className="text-primary" size={size >= 300 ? 64 : 48} />
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
