import { useState, type ReactNode } from "react";
import { useCopy } from "@/lib/useCopy";
export function IdentityAvatar({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="identity-avatar">
      {src && !failed ? (
        <img src={src} alt={name} onError={() => setFailed(true)} />
      ) : (
        <span aria-label={name}>{name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}
export default function ProfileIdentity({
  name,
  login,
  avatar,
  context,
  description,
  actions,
}: {
  name: string;
  login?: string | null;
  avatar?: string | null;
  context: string;
  description: string;
  actions?: ReactNode;
}) {
  const c = useCopy();
  return (
    <header className="profile-identity">
      <IdentityAvatar key={avatar} src={avatar} name={name} />
      <div className="identity-copy">
        <p className="eyebrow">{context}</p>
        <h1>{name}</h1>
        {login && (
          <a
            href={`https://www.twitch.tv/${encodeURIComponent(login)}`}
            target="_blank"
            rel="noreferrer"
          >
            @{login} <span>{c("on Twitch", "на Twitch")} ↗</span>
          </a>
        )}
        <p>{description}</p>
      </div>
      {actions && <div className="identity-actions">{actions}</div>}
    </header>
  );
}
