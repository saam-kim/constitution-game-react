import { useMemo, useState } from "react";
import {
  FIREBASE_CONFIG_STORAGE_KEY,
  firebaseConfigSource,
  getSavedFirebaseConfig,
  isFirebaseConfigured
} from "./firebase";

const CONFIG_KEYS = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId"
];

const extractFirebaseConfig = text => {
  const parsed = {};

  for (const key of CONFIG_KEYS) {
    const pattern = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
    const match = text.match(pattern);
    if (match?.[1]) parsed[key] = match[1].trim();
  }

  return parsed;
};

const hasRuntimeConfig = config =>
  Boolean(
    config?.apiKey &&
      config?.authDomain &&
      config?.databaseURL &&
      config?.projectId &&
      config?.appId
  );

export default function FirebaseSetupPanel() {
  const savedConfig = getSavedFirebaseConfig();
  const [open, setOpen] = useState(!isFirebaseConfigured);
  const [configText, setConfigText] = useState(() =>
    savedConfig
      ? JSON.stringify(savedConfig, null, 2)
      : `const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};`
  );
  const [message, setMessage] = useState("");

  const sourceText = useMemo(() => {
    if (firebaseConfigSource === "browser") return "브라우저 저장 설정으로 실시간 연동 중";
    if (firebaseConfigSource === "env") return ".env 설정으로 실시간 연동 중";
    return "현재는 로컬 데모 모드";
  }, []);

  const saveConfig = () => {
    const parsed = extractFirebaseConfig(configText);

    if (!hasRuntimeConfig(parsed)) {
      setMessage(
        "apiKey, authDomain, databaseURL, projectId, appId 값이 모두 필요합니다."
      );
      return;
    }

    window.localStorage.setItem(
      FIREBASE_CONFIG_STORAGE_KEY,
      JSON.stringify(parsed)
    );
    setMessage("Firebase 설정을 저장했습니다. 새로고침하면 실시간 연동으로 전환됩니다.");
  };

  const clearConfig = () => {
    window.localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
    setMessage(
      "브라우저 저장 설정을 지웠습니다. 새로고침하면 .env 또는 로컬 데모 모드로 전환됩니다."
    );
  };

  return (
    <section className="mt-6 border-t border-[var(--color-border)] pt-5">
      <div className={isFirebaseConfigured ? "status-callout" : "danger-callout"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{sourceText}</span>
          <button
            type="button"
            onClick={() => setOpen(prev => !prev)}
            className="button-secondary px-3 py-2 text-sm"
          >
            Firebase 설정
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-white p-4">
          <p className="font-bold text-[var(--color-text)]">
            Firebase 콘솔의 웹 앱 설정 객체를 그대로 붙여넣으세요.
          </p>
          <p className="mt-2 text-sm font-bold muted">
            저장 후 새로고침하면 이 브라우저는 Realtime Database를 사용합니다.
            학생 기기들도 같은 설정이 들어간 배포 주소나 같은 .env 빌드를 사용해야 함께 연동됩니다.
          </p>

          <textarea
            value={configText}
            onChange={event => setConfigText(event.target.value)}
            className="field-control mt-4 min-h-48 font-mono text-sm"
            spellCheck={false}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveConfig}
              className="button-primary px-5 py-3"
            >
              설정 저장
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="button-secondary px-5 py-3"
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={clearConfig}
              className="button-secondary px-5 py-3"
            >
              저장 설정 지우기
            </button>
          </div>

          {message && <p className="info-callout mt-4 text-base">{message}</p>}
        </div>
      )}
    </section>
  );
}
