import { authApi } from "@/lib/apiClient";
import { useCopy } from "@/lib/useCopy";
import Brand from "@/components/layout/Brand";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

export default function LoginPage() {
  const c = useCopy();
  return (
    <div className="entry-page">
      <header className="entry-masthead">
        <Brand />
        <LanguageSwitcher variant="compact" />
      </header>
      <main className="entry-login">
        <section className="entry-intro">
          <p className="eyebrow">TWITCH / MARKET.CSGO.COM</p>
          <h1>
            {c(
              "Your channels. Your rewards. One place.",
              "Ваши каналы. Ваши награды. Всё рядом.",
            )}
          </h1>
          <p className="entry-lead">
            {c(
              "Follow your rewards from Channel Points to CS items. Pick up where you left off, across the channels you’re part of.",
              "Следите за наградами: от баллов канала до предметов CS. Возвращайтесь к своему профилю и каналам, в которых участвуете.",
            )}
          </p>
          <dl className="entry-contexts">
            <div>
              <dt>{c("Your profile", "Ваш профиль")}</dt>
              <dd>
                {c(
                  "Reward history and activity across channels, with eligibility in each community.",
                  "История наград и активность на всех каналах, условия получения в каждом сообществе.",
                )}
              </dd>
            </div>
            <div>
              <dt>{c("Your channel spaces", "Ваши каналы")}</dt>
              <dd>
                {c(
                  "Move between communities and channels you help run. Your access follows your Twitch account.",
                  "Переключайтесь между сообществами и каналами, которыми помогаете управлять. Доступ связан с аккаунтом Twitch.",
                )}
              </dd>
            </div>
            <div>
              <dt>{c("Behind the rewards", "Управление наградами")}</dt>
              <dd>
                {c(
                  "Streamers and authorized editors can configure rewards, track purchases and resolve held redemptions.",
                  "Стримеры и назначенные редакторы настраивают награды, отслеживают покупки и разрешают удержанные заявки.",
                )}
              </dd>
            </div>
          </dl>
        </section>
        <section className="entry-access" aria-labelledby="sign-in-title">
          <p className="eyebrow">
            {c("WELCOME BACK / START HERE", "С ВОЗВРАЩЕНИЕМ / НАЧНИТЕ ЗДЕСЬ")}
          </p>
          <h2 id="sign-in-title">
            {c(
              "Continue with your Twitch account",
              "Войдите с аккаунтом Twitch",
            )}
          </h2>
          <p>
            {c(
              "For viewers, editors and returning streamers. Sign in to open your profile and the channels you already have access to.",
              "Для зрителей, редакторов и стримеров. Войдите, чтобы открыть профиль и доступные вам каналы.",
            )}
          </p>
          <a className="entry-primary" href={authApi.loginUrl()}>
            {c("Sign in with Twitch", "Войти через Twitch")}
            <span aria-hidden="true">↗</span>
          </a>
          <p className="entry-note">
            {c(
              "Editor access must be granted by a channel owner. Signing in does not grant moderation permissions.",
              "Доступ редактора предоставляет владелец канала. Сам вход не даёт прав модерации.",
            )}
          </p>
          <div className="entry-connect">
            <h3>
              {c("Bringing your own channel?", "Подключаете свой канал?")}
            </h3>
            <p>
              {c(
                "Connect it to enable reward management and bot access. Twitch will ask for additional channel permissions.",
                "Подключите канал для управления наградами и работы бота. Twitch запросит дополнительные разрешения канала.",
              )}
            </p>
            <a href={authApi.connectUrl()}>
              {c("Connect my Twitch channel", "Подключить мой канал Twitch")}{" "}
              <span aria-hidden="true">→</span>
            </a>
          </div>
          <p className="entry-note">
            {c(
              "Authorization takes place on Twitch. No separate password is needed here.",
              "Авторизация проходит на Twitch. Отдельный пароль здесь не нужен.",
            )}
          </p>
        </section>
      </main>
      <footer className="entry-footer">
        NECKO7{" "}
        <span>
          {c(
            "Community activity · Channel rewards · Purchase operations",
            "Активность сообществ · Награды каналов · Управление покупками",
          )}
        </span>
      </footer>
    </div>
  );
}
