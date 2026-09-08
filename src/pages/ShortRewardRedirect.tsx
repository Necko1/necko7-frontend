import { useParams, Navigate } from "react-router-dom";
import { base64UrlToUuid } from "@/lib/shortUrl";

/**
 * Route handler for compact reward links: /r/:identifier/:shortRewardId
 * Statelessly expands the 22-char base64url reward ID into a 36-char UUID
 * and seamlessly redirects the viewer to /c/:identifier/rewards/:uuid.
 */
export default function ShortRewardRedirect() {
  const { identifier, shortRewardId } = useParams<{
    identifier: string;
    shortRewardId: string;
  }>();

  if (!identifier || !shortRewardId) {
    return <Navigate to="/dashboard" replace />;
  }

  const fullUuid = base64UrlToUuid(shortRewardId);
  return <Navigate to={`/c/${encodeURIComponent(identifier)}/rewards/${fullUuid}`} replace />;
}
