import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi, usersApi } from "@/lib/apiClient";
import { useCopy } from "@/lib/useCopy";
import Brand from "@/components/layout/Brand";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import type { AxiosError } from "axios";

export default function InitBotPage() {
  const c = useCopy();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.me().then((r) => r.data),
    retry: false,
    staleTime: 0,
  });
  const status = (error as AxiosError)?.response?.status;
  if (data) return <Navigate to="/dashboard" replace />;
  if (status === 401) return <Navigate to="/login" replace />;
  return (
    <div className="entry-page setup-page">
      <header className="entry-masthead">
        <Brand />
        <LanguageSwitcher variant="compact" />
      </header>
      <main>
        <div className="setup-heading">
          <p className="eyebrow">
            {c(
              "INSTANCE SETUP / ADMINISTRATOR",
              "НАСТРОЙКА СИСТЕМЫ / АДМИНИСТРАТОР",
            )}
          </p>
          <h1>{c("Initialize the bot integration", "Инициализация бота")}</h1>
          <p className="entry-lead">
            {c(
              "One-time configuration for the instance owner. Connect the dedicated Twitch bot account before users can access this application.",
              "Однократная настройка владельцем системы. Подключите отдельный аккаунт бота Twitch, чтобы открыть приложение пользователям.",
            )}
          </p>
        </div>
        {isLoading ? (
          <p role="status">
            {c(
              "Checking initialization state…",
              "Проверяем состояние системы…",
            )}
          </p>
        ) : status !== 404 ? (
          <section role="alert" className="setup-unavailable">
            <h2>
              {c(
                "Setup state is unavailable",
                "Состояние настройки недоступно",
              )}
            </h2>
            <p>
              {c(
                "The server could not confirm whether this instance is initialized. Check backend availability before authorizing an account.",
                "Сервер не подтвердил состояние инициализации. Проверьте доступность бэкенда перед авторизацией аккаунта.",
              )}
            </p>
            <Button onClick={() => refetch()}>
              {c("Check again", "Проверить снова")}
            </Button>
          </section>
        ) : (
          <div className="setup-layout">
            <section aria-labelledby="prerequisites">
              <h2 id="prerequisites">
                {c(
                  "Prepare the Twitch application",
                  "Подготовьте приложение Twitch",
                )}
              </h2>
              <ol className="setup-steps">
                <li>
                  <div>
                    <h3>
                      {c(
                        "Register your application",
                        "Зарегистрируйте приложение",
                      )}
                    </h3>
                    <p>
                      {c(
                        "Create an application in the ",
                        "Создайте приложение в ",
                      )}
                      <a
                        href="https://dev.twitch.tv/console"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Twitch Developer Console ↗
                      </a>
                      .
                    </p>
                  </div>
                </li>
                <li>
                  <div>
                    <h3>
                      {c("Set the OAuth callback", "Укажите OAuth callback")}
                    </h3>
                    <p>
                      {c(
                        "Use your public backend address, matching APP_URL on the server, followed by this path:",
                        "Используйте публичный адрес бэкенда, совпадающий с APP_URL на сервере, и этот путь:",
                      )}
                    </p>
                    <code>/api/v1/auth/callback</code>
                    <p className="entry-note">
                      {c(
                        "Example: https://your-backend.domain/api/v1/auth/callback",
                        "Пример: https://your-backend.domain/api/v1/auth/callback",
                      )}
                    </p>
                  </div>
                </li>
                <li>
                  <div>
                    <h3>{c("Configure the backend", "Настройте бэкенд")}</h3>
                    <p>
                      {c(
                        "Set the application credentials in the server environment (.env), then restart the backend to apply them.",
                        "Укажите данные приложения в окружении сервера (.env) и перезапустите бэкенд для их применения.",
                      )}
                    </p>
                    <div className="setup-variables">
                      <code>TWITCH_CLIENT_ID</code>
                      <code>TWITCH_CLIENT_SECRET</code>
                    </div>
                    <p className="entry-note">
                      {c(
                        "Keep the client secret on the server. It is never entered on this page.",
                        "Client Secret хранится на сервере. На этой странице его вводить не нужно.",
                      )}
                    </p>
                  </div>
                </li>
              </ol>
            </section>
            <aside className="setup-authorize">
              <p className="setup-state">
                <span />
                {c("Awaiting bot authorization", "Ожидается авторизация бота")}
              </p>
              <h2>
                {c("Authorize the bot account", "Авторизуйте аккаунт бота")}
              </h2>
              <p>
                {c(
                  "On Twitch, select the dedicated account that will read and send chat messages as the bot. Verify the account before approving access.",
                  "На Twitch выберите отдельный аккаунт, от имени которого бот будет читать и отправлять сообщения. Проверьте аккаунт перед подтверждением доступа.",
                )}
              </p>
              <div className="setup-scopes">
                <h3>
                  {c("Requested bot permissions", "Запрашиваемые права бота")}
                </h3>
                <code>user:read:chat</code>
                <code>user:write:chat</code>
                <code>user:bot</code>
              </div>
              <a className="entry-primary" href={authApi.initBotUrl()}>
                {c("Authorize bot on Twitch", "Авторизовать бота на Twitch")}
                <span aria-hidden="true">↗</span>
              </a>
              <p className="entry-note">
                {c(
                  "Successful authorization initializes this instance and unlocks normal sign-in. Streamers connect their own channels separately afterwards.",
                  "После успешной авторизации система будет инициализирована и откроется обычный вход. Стримеры подключат свои каналы отдельно.",
                )}
              </p>
            </aside>
          </div>
        )}
      </main>
      <footer className="entry-footer">
        NECKO7{" "}
        <span>
          {c(
            "Instance configuration · Twitch application & bot account",
            "Настройка системы · Приложение Twitch и аккаунт бота",
          )}
        </span>
      </footer>
    </div>
  );
}
