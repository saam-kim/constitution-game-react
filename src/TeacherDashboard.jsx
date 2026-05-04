import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from "recharts";
import {
  SESSION_PHASES,
  getTaxPolicy,
  getBudgetDirection,
  getWagePolicy,
  useGameData
} from "./useGameData";
import { getAppPath, getAppUrl } from "./routes";

const COLORS = ["#1B6BFF", "#2E7D4F", "#0A2E7A"];
const SESSION_SECONDS = 5 * 60;
const TEACHER_PIN = "1234";
const AUTO_CREATE_LOCK_KEY = "constitution-game:auto-create-lock";

const formatTime = seconds => {
  const safeSeconds = Math.max(0, seconds ?? 0);
  const m = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const s = String(safeSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const csvEscape = value => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const formatDateTime = value => {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
};

const phaseLabel = phase =>
  SESSION_PHASES.find(item => item.key === phase)?.label ?? "토론";

const getStudentUrl = (pin, groupId) => {
  return getAppUrl({ role: "student", pin, groupId });
};

const getHomeUrl = () => getAppUrl();

const getQrUrl = value =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(value)}`;

const formatTaxPolicy = constitution => getTaxPolicy(constitution).label;

const formatBudgetDirection = constitution =>
  getBudgetDirection(constitution).label;

const formatWagePolicy = constitution => getWagePolicy(constitution).label;

const formatPolicySummary = constitution =>
  `세금 ${formatTaxPolicy(constitution)} · 예산 방향 ${formatBudgetDirection(
    constitution
  )} · 최저임금 ${formatWagePolicy(constitution)}`;

const downloadCsv = ({ pin, groups }) => {
  const headers = [
    "PIN",
    "모둠",
    "접속",
    "제출",
    "제출 시각",
    "세금 정책 방향",
    "국가 예산 방향",
    "최저임금 방향",
    "미래의 나",
    "생존 지수",
    "자산 성장률",
    "사회 통합도",
    "최종 점수",
    "결과 메시지"
  ];

  const rows = groups.map(group => [
    pin,
    group.name,
    group.connected ? "접속" : "미접속",
    group.isSubmitted ? "제출 완료" : "작성 중",
    formatDateTime(group.submittedAt),
    formatTaxPolicy(group.constitution),
    formatBudgetDirection(group.constitution),
    formatWagePolicy(group.constitution),
    group.assignedClass?.label,
    group.result?.survivalIndex,
    group.result?.assetGrowth,
    group.result?.socialIntegration,
    group.result?.classResult?.score,
    group.result?.classResult?.message
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `헌법제정게임_${pin || "session"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const downloadDetailedCsv = ({ pin, groups }) => {
  const headers = [
    "세션 PIN",
    "모둠",
    "접속 상태",
    "제출 상태",
    "제출 시각",
    "1차 세금 정책 방향",
    "1차 국가 예산 방향",
    "1차 최저임금 방향",
    "최종 세금 정책 방향",
    "최종 국가 예산 방향",
    "최종 최저임금 방향",
    "미래 위치",
    "생존 지수",
    "자산 성장률",
    "사회 통합도",
    "최종 점수",
    "결과 메시지",
    "사건 카드 1",
    "사건 카드 2",
    "사건 카드 3"
  ];

  const rows = groups.map(group => {
    const firstRound = group.history?.[0];
    const firstConstitution = firstRound?.constitution ?? {};
    const eventCards = group.result?.eventCards ?? [];

    return [
      pin,
      group.name,
      group.connected ? "접속" : "미접속",
      group.isSubmitted ? "제출 완료" : "작성 중",
      formatDateTime(group.submittedAt),
      firstRound ? formatTaxPolicy(firstConstitution) : "",
      firstRound ? formatBudgetDirection(firstConstitution) : "",
      firstRound ? formatWagePolicy(firstConstitution) : "",
      formatTaxPolicy(group.constitution),
      formatBudgetDirection(group.constitution),
      formatWagePolicy(group.constitution),
      group.assignedClass?.label,
      group.result?.survivalIndex,
      group.result?.assetGrowth,
      group.result?.socialIntegration,
      group.result?.classResult?.score,
      group.result?.classResult?.message,
      eventCards[0] ? `${eventCards[0].title} - ${eventCards[0].question}` : "",
      eventCards[1] ? `${eventCards[1].title} - ${eventCards[1].question}` : "",
      eventCards[2] ? `${eventCards[2].title} - ${eventCards[2].question}` : ""
    ];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `헌법제정게임_수업기록_${pin || "session"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function ScoreCard({ label, value, suffix = "점" }) {
  return (
    <div className="metric-card">
      <p className="text-base font-bold muted">{label}</p>
      <p className="mt-2 text-4xl font-black text-brand">
        {value}
        <span className="text-xl">{suffix}</span>
      </p>
    </div>
  );
}

function GroupLockPanel({ groupLocked, connectedCount, totalCount, onFinalize }) {
  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="panel-label">참여 모둠</p>
          <h2 className="panel-heading">
            {groupLocked ? `${totalCount}개 모둠 확정` : `${connectedCount}/${totalCount} 입장`}
          </h2>
          <p className="mt-2 text-sm font-bold muted">
            확정하면 입장하지 않은 모둠은 대시보드에서 사라집니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onFinalize}
          disabled={groupLocked || connectedCount === 0}
          className="button-primary h-14 min-w-36 px-5 text-lg"
        >
          {groupLocked ? "확정 완료" : "모둠 확정"}
        </button>
      </div>
    </section>
  );
}

function TimerStartPanel({ groupLocked, isRunning, remainingSeconds, onStart }) {
  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="panel-label">수업 타이머</p>
          <h2 className="panel-heading">
            {isRunning ? "진행 중" : "시작 대기"}
          </h2>
          <p className="mt-2 text-sm font-bold muted">
            모둠을 확정한 뒤 시작하면 그때부터 5분 타이머가 줄어듭니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="metric-card min-w-44 text-center">
            <p className="panel-label">남은 시간</p>
            <p className="mt-1 font-sans text-4xl font-black text-brand tabular-nums">
              {formatTime(remainingSeconds)}
            </p>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={!groupLocked || isRunning}
            className="button-primary h-14 min-w-36 px-5 text-lg"
          >
            {isRunning ? "시작됨" : "수업 시작"}
          </button>
        </div>
      </div>

      {!groupLocked && (
        <p className="info-callout mt-4 text-base">
          먼저 입장한 모둠을 확정하면 타이머를 시작할 수 있습니다.
        </p>
      )}
    </section>
  );
}

function GroupResultSwitcher({ groups, selectedGroupId, onSelect }) {
  if (groups.length <= 1) return null;

  return (
    <div className="result-switcher">
      <p className="panel-label">결과 볼 모둠</p>
      <div className="result-switcher-buttons">
        {groups.map(group => {
          const active = group.id === selectedGroupId;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelect(group.id)}
              className={`result-group-button ${active ? "active" : ""}`}
            >
              <span>{group.name}</span>
              <small>{group.isSubmitted ? "제출" : group.connected ? "작성 중" : "미접속"}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhaseControls({ phase, onChange, groups, selectedGroupId, onSelectGroup }) {
  const showGroupSwitcher = ["result", "revision", "final"].includes(phase);

  return (
    <section className="panel">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="panel-label">게임 진행</p>
          <h2 className="panel-heading">{phaseLabel(phase)}</h2>
        </div>
        <p className="text-sm font-bold muted">
          토론 → 헌법 제정 → 결과 확인 → 새 헌법 토론 → 최종 결과 및 발표
        </p>
      </div>

      <div className="phase-grid">
        {SESSION_PHASES.map(item => {
          const active = item.key === phase;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`phase-button ${active ? "active" : ""}`}
            >
              <span className="block">{item.label}</span>
              <span className="phase-note">
                {item.note}
              </span>
            </button>
          );
        })}
      </div>

      {showGroupSwitcher && (
        <GroupResultSwitcher
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelect={onSelectGroup}
        />
      )}
    </section>
  );
}

function StudentEntryPanel({ pin, groups }) {
  const homeUrl = getHomeUrl();

  return (
    <section className="panel entry-panel">
      <div>
        <p className="panel-label">학생 입장</p>
        <h2 className="panel-heading mt-1">공유 링크와 QR</h2>
        <p className="mt-2 font-bold muted">
          학생에게는 기본 주소와 참가 PIN만 안내하면 됩니다. 모둠별 바로가기 링크도 보조로 사용할 수 있습니다.
        </p>
      </div>

      <div className="entry-layout mt-5">
        <div className="metric-card">
          <p className="panel-label">학생 접속 주소</p>
          <a className="entry-url mt-2" href={homeUrl} target="_blank" rel="noreferrer">
            {homeUrl}
          </a>
          <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr]">
            <div className="value-pill">{pin}</div>
            <p className="font-bold muted">
              학생은 이 참가 PIN을 입력한 뒤 자기 모둠을 선택해서 입장합니다.
            </p>
          </div>
        </div>

        <div className="qr-card">
          <img src={getQrUrl(homeUrl)} alt="학생 입장 QR" />
          <p className="qr-caption">학생 접속 QR</p>
        </div>
      </div>

      <div className="entry-links mt-5">
        {groups.map(group => (
          <a
            key={group.id}
            href={getStudentUrl(pin, group.id)}
            target="_blank"
            rel="noreferrer"
            className="button-secondary"
          >
            {group.name} 바로가기
          </a>
        ))}
      </div>
    </section>
  );
}

const getNextPhase = phase => {
  const currentIndex = SESSION_PHASES.findIndex(item => item.key === phase);
  if (currentIndex < 0) return SESSION_PHASES[0];
  return SESSION_PHASES[currentIndex + 1] ?? null;
};

function QuickProgressPanel({ phase, onChange }) {
  const nextPhase = getNextPhase(phase);

  return (
    <section className="panel quick-panel">
      <div>
        <p className="panel-label">교사 진행</p>
        <h2 className="panel-heading mt-1">현재 단계: {phaseLabel(phase)}</h2>
        <p className="mt-2 font-bold muted">
          수업 중에는 큰 버튼 하나로 다음 단계로 넘기고, 필요할 때만 아래 단계표에서 직접 조정하세요.
        </p>
      </div>
      <button
        type="button"
        disabled={!nextPhase}
        onClick={() => nextPhase && onChange(nextPhase.key)}
        className="button-primary h-16 min-w-48 px-6 text-xl"
      >
        {nextPhase ? `${nextPhase.label} 단계로 진행` : "진행 완료"}
      </button>
    </section>
  );
}

function TeacherEventCards({ cards = [] }) {
  if (!cards.length) return null;

  return (
    <section className="panel">
      <p className="panel-label">뉴스/사건 카드</p>
      <h2 className="panel-heading mt-1">이 헌법이 만든 사회적 장면</h2>
      <div className="event-grid mt-5">
        {cards.map((card, index) => (
          <article key={`${card.title}-${index}`} className={`event-card ${card.type ?? "mixed"}`}>
            <p className="event-card-label">NEWS {index + 1}</p>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <strong>{card.question}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeacherPresentationCard({ group }) {
  const firstRound = group?.history?.[0];
  const result = group?.result;

  if (!firstRound && !result) return null;

  return (
    <section className="panel">
      <p className="panel-label">발표 카드</p>
      <h2 className="panel-heading mt-1">{group.name} 발표 흐름</h2>
      <div className="presentation-grid mt-5">
        <div>
          <p className="panel-label">처음 선택</p>
          <p>
            {formatPolicySummary(firstRound?.constitution ?? group.constitution)}
          </p>
        </div>
        <div>
          <p className="panel-label">드러난 미래 위치</p>
          <p>{group.assignedClass?.label ?? firstRound?.assignedClass?.label ?? "아직 공개 전"}</p>
        </div>
        <div>
          <p className="panel-label">최종 선택</p>
          <p>
            {formatPolicySummary(group.constitution)}
          </p>
        </div>
        <div>
          <p className="panel-label">발표 질문</p>
          <p>처음 규칙과 최종 규칙은 어떻게 달라졌고, 그 변화는 누구에게 더 공정한가요?</p>
        </div>
      </div>
    </section>
  );
}

function FutureSelfPanel({ selectedGroup }) {
  const futureSelf = selectedGroup?.assignedClass;

  if (!futureSelf) {
    return (
      <div className="metric-card mt-5">
        <p className="panel-label">무지의 베일</p>
        <p className="mt-2 font-bold">
          아직 이 모둠의 미래 위치는 공개되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="future-card mt-5">
      <p className="panel-label">공개된 미래의 나</p>
      <h3 className="panel-heading mt-1">{futureSelf.label}</h3>
      <p className="mt-3 font-bold text-[var(--color-text)]">
        {futureSelf.headline ?? "공개된 위치에서 헌법의 영향을 다시 살펴봅니다."}
      </p>
      <p className="mt-3 font-serif text-lg leading-8 text-[var(--color-text)]">
        {futureSelf.situation ??
          "이 위치의 시민에게 세금, 복지, 최저임금이 어떤 의미인지 토론해 보세요."}
      </p>
      <div className="mt-4 grid gap-3">
        <div className="metric-card">
          <p className="panel-label">중요한 기준</p>
          <p className="mt-2 font-bold">
            {futureSelf.priority ?? "생활 안정, 기회, 공정한 부담"}
          </p>
        </div>
        <div className="metric-card">
          <p className="panel-label">재토론 질문</p>
          <p className="mt-2 font-bold">
            {futureSelf.question ??
              "이 위치에서 다시 태어나도 이 헌법을 받아들일 수 있나요?"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ groups, selectedGroupId, onSelect }) {
  return (
    <section className="panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="panel-label">전체 비교</p>
          <h2 className="panel-heading">모둠별 헌법과 결과</h2>
        </div>
        <p className="text-sm font-bold muted">
          행을 누르면 발표 모둠으로 선택됩니다.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="px-3 py-3">모둠</th>
              <th className="px-3 py-3">상태</th>
              <th className="px-3 py-3">세금 방향</th>
              <th className="px-3 py-3">예산 방향</th>
              <th className="px-3 py-3">최저임금 방향</th>
              <th className="px-3 py-3 text-right">1차 결과</th>
              <th className="px-3 py-3">미래의 나</th>
              <th className="px-3 py-3 text-right">생존</th>
              <th className="px-3 py-3 text-right">성장</th>
              <th className="px-3 py-3 text-right">통합</th>
              <th className="px-3 py-3 text-right">최종</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const active = group.id === selectedGroupId;
              const firstResult = group.history?.[0]?.result?.classResult?.score;

              return (
                <tr
                  key={group.id}
                  onClick={() => onSelect(group.id)}
                  className={active ? "active" : ""}
                >
                  <td>{group.name}</td>
                  <td>
                    {group.isSubmitted ? "제출 완료" : group.connected ? "작성 중" : "미접속"}
                  </td>
                  <td>
                    {group.constitution ? formatTaxPolicy(group.constitution) : "-"}
                  </td>
                  <td>
                    {group.constitution ? formatBudgetDirection(group.constitution) : "-"}
                  </td>
                  <td>
                    {group.constitution ? formatWagePolicy(group.constitution) : "-"}
                  </td>
                  <td className="text-right">{firstResult ?? "-"}</td>
                  <td>{group.assignedClass?.label ?? "-"}</td>
                  <td className="text-right">
                    {group.result?.survivalIndex ?? "-"}
                  </td>
                  <td className="text-right">
                    {group.result?.assetGrowth ?? "-"}
                  </td>
                  <td className="text-right">
                    {group.result?.socialIntegration ?? "-"}
                  </td>
                  <td className="text-right">
                    {group.result?.classResult?.score ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TeacherDashboard({ pin, teacherPin = "" }) {
  const {
    session,
    groups,
    loading,
    phase,
    remainingSeconds,
    selectGroup,
    setPhase,
    finalizeGroups,
    startSession,
    runRoulette,
    createSession,
    isDemoMode
  } = useGameData(pin);
  const [rolling, setRolling] = useState(false);
  const [slotText, setSlotText] = useState("아직 공개 전");
  const [createdPin, setCreatedPin] = useState(pin || "");
  const [setupMessage, setSetupMessage] = useState("");
  const autoCreateRef = useRef(false);

  const groupList = useMemo(() => Object.values(groups), [groups]);
  const selectedGroup = session?.selectedGroupId
    ? groups[session.selectedGroupId]
    : groupList[0];
  const submittedCount = groupList.filter(group => group.isSubmitted).length;
  const connectedCount = groupList.filter(group => group.connected).length;
  const groupLocked = Boolean(session?.groupLocked);
  const isRunning = session?.status === "running";
  const isFinalPhase = phase === "final";

  const chartData = selectedGroup?.constitution
    ? [
        {
          name: getTaxPolicy(selectedGroup.constitution).shortLabel,
          value: getTaxPolicy(selectedGroup.constitution).taxRate
        },
        {
          name: getBudgetDirection(selectedGroup.constitution).shortLabel,
          value: getBudgetDirection(selectedGroup.constitution).welfareBudget
        },
        {
          name: getWagePolicy(selectedGroup.constitution).shortLabel,
          value: Math.round(getWagePolicy(selectedGroup.constitution).minimumWage / 1000)
        }
      ]
    : [];

  const pieData = selectedGroup?.constitution
    ? [
        {
          name: formatTaxPolicy(selectedGroup.constitution),
          value: getTaxPolicy(selectedGroup.constitution).taxRate
        },
        {
          name: formatBudgetDirection(selectedGroup.constitution),
          value: getBudgetDirection(selectedGroup.constitution).welfareBudget
        },
        {
          name: formatWagePolicy(selectedGroup.constitution),
          value: Math.round(getWagePolicy(selectedGroup.constitution).minimumWage / 300)
        }
      ]
    : [];

  const handleCreate = async () => {
    if (autoCreateRef.current) return;
    autoCreateRef.current = true;

    try {
      const created = await createSession({
        durationSeconds: SESSION_SECONDS
      });
      const newPin = typeof created === "string" ? created : created.pin;
      setCreatedPin(newPin);
      window.sessionStorage.removeItem(AUTO_CREATE_LOCK_KEY);
      const teacherUrl = getAppPath({
        role: "teacher",
        teacherPin: TEACHER_PIN,
        pin: newPin
      });
      window.history.replaceState(null, "", teacherUrl);
      window.location.reload();
    } catch (err) {
      autoCreateRef.current = false;
      window.sessionStorage.removeItem(AUTO_CREATE_LOCK_KEY);
      setSetupMessage(err.message);
    }
  };

  useEffect(() => {
    if (teacherPin !== TEACHER_PIN || pin || createdPin) return;

    const lockedAt = Number(window.sessionStorage.getItem(AUTO_CREATE_LOCK_KEY) ?? 0);
    if (Date.now() - lockedAt < 8000) return;

    window.sessionStorage.setItem(AUTO_CREATE_LOCK_KEY, String(Date.now()));
    handleCreate();
  }, [teacherPin, pin, createdPin]);

  const handleStartSession = async () => {
    const result = await startSession();
    if (!result.ok) {
      setSetupMessage("이미 시작되었거나 세션을 찾을 수 없습니다.");
    } else {
      setSetupMessage("수업 타이머가 시작되었습니다.");
    }
  };

  const handleFinalizeGroups = async () => {
    const result = await finalizeGroups();
    if (!result.ok) {
      setSetupMessage("입장한 모둠이 없습니다. 학생들이 먼저 입장한 뒤 확정해 주세요.");
    } else {
      setSetupMessage(`${result.count}개 모둠으로 게임 참여 모둠을 확정했습니다.`);
    }
  };

  const handleRoulette = async () => {
    if (!selectedGroup?.id || rolling || !selectedGroup.isSubmitted) return;

    const finalCheck = phase === "final" && selectedGroup.assignedClass;

    if (finalCheck) {
      const outcome = await runRoulette(selectedGroup.id);

      if (outcome?.picked?.label) {
        setSlotText(outcome.picked.label);
      }

      return;
    }

    setRolling(true);
    const labels = [
      "저소득 가정의 청소년",
      "자영업자",
      "중산층 직장인",
      "고소득 전문직",
      "노후 소득이 부족한 노인"
    ];
    let tick = 0;

    const timer = setInterval(() => {
      setSlotText(labels[tick % labels.length]);
      tick += 1;
    }, 120);

    await new Promise(resolve => setTimeout(resolve, 3800));

    clearInterval(timer);
    const outcome = await runRoulette(selectedGroup.id);

    if (outcome?.picked?.label) {
      setSlotText(outcome.picked.label);
    }

    setRolling(false);
  };

  if (teacherPin !== TEACHER_PIN) {
    return (
      <main className="app-page center-page">
        <section className="brand-card">
          <div className="mb-6 flex items-center gap-4">
            <div className="brand-logo">붕</div>
            <div>
              <p className="brand-kicker">교사용 접근 제한</p>
              <h1 className="brand-title">교사용 PIN이 필요합니다</h1>
            </div>
          </div>

          <p className="danger-callout text-base">
            교사용 화면은 4자리 교사용 PIN을 입력해야 열 수 있습니다.
            처음 화면에서 교사를 선택하고 교사용 PIN을 입력해 주세요.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = getAppPath();
            }}
            className="button-secondary mt-6 h-14 w-full text-lg"
          >
            입장 화면으로 돌아가기
          </button>
        </section>
      </main>
    );
  }

  if (!pin && !createdPin) {
    return (
      <main className="app-page center-page text-center">
        <section className="brand-card">
          <div className="mb-6 flex items-center gap-4">
            <div className="brand-logo">붕</div>
            <div className="text-left">
              <p className="brand-kicker">교사용 대시보드</p>
              <h1 className="brand-title">새 세션을 준비하고 있습니다</h1>
            </div>
          </div>

          <p className="status-callout text-base">
            잠시 후 바로 교사용 대시보드로 이동합니다.
          </p>

          {setupMessage && (
            <>
              <p className="danger-callout mt-4 text-base">
                {setupMessage}
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="button-primary mt-4 h-14 w-full text-lg"
              >
                다시 시도
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="app-page center-page text-3xl font-bold text-brand">
        대시보드 불러오는 중
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-page center-page text-3xl font-bold text-red-700">
        세션을 찾을 수 없습니다.
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="flex items-center gap-4">
          <div className="brand-logo">붕</div>
          <div>
            <div className="flex items-center gap-3">
              <p className="brand-kicker">교사용 대시보드</p>
              {isDemoMode && (
                <span className="rounded bg-[var(--color-brand-soft)] px-2 py-1 text-xs font-black text-[var(--color-brand-ink)]">
                  로컬 데모
                </span>
              )}
            </div>
            <h1>헌법 제정 게임 PIN {pin}</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => downloadDetailedCsv({ pin, groups: groupList })}
            className="button-secondary h-12 px-4 text-sm"
          >
            CSV 저장
          </button>
          <div className="text-right">
            <p className="panel-label">제출 현황</p>
            <p className="text-3xl font-black text-brand">
              {submittedCount}/{groupList.length}
            </p>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="sidebar">
          <h2 className="panel-heading mb-4">모둠 현황</h2>

          <div className="grid gap-3">
            {groupList.map(group => {
              const active = group.id === selectedGroup?.id;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => selectGroup(group.id)}
                  className={`group-button ${active ? "active" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-black">{group.name}</p>
                    {group.isSubmitted && (
                      <span className="value-pill">제출</span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2 text-sm font-bold muted">
                    <span>{group.connected ? "접속" : "미접속"}</span>
                    <span>/</span>
                    <span>{group.isSubmitted ? "제출 완료" : "작성 중"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="main-grid">
          <StudentEntryPanel pin={pin} groups={groupList} />

          <GroupLockPanel
            groupLocked={groupLocked}
            connectedCount={connectedCount}
            totalCount={groupList.length}
            onFinalize={handleFinalizeGroups}
          />

          <TimerStartPanel
            groupLocked={groupLocked}
            isRunning={isRunning}
            remainingSeconds={remainingSeconds}
            onStart={handleStartSession}
          />

          {setupMessage && (
            <p className="status-callout text-base">
              {setupMessage}
            </p>
          )}

          <QuickProgressPanel phase={phase} onChange={setPhase} />

          <PhaseControls
            phase={phase}
            onChange={setPhase}
            groups={groupList}
            selectedGroupId={selectedGroup?.id}
            onSelectGroup={selectGroup}
          />

          <div className="chart-row">
            <section className="panel">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="panel-heading">
                  {selectedGroup?.name ?? "모둠 선택"}
                </h2>
                <span className="section-badge">
                  발표 모드
                </span>
              </div>

              <div className="h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#5A6372" />
                    <YAxis stroke="#5A6372" />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #cfd6e2",
                        color: "#111418"
                      }}
                    />
                    <Bar dataKey="value" fill="#1B6BFF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-heading mb-4">헌법 구성 비율</h2>

              <div className="h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={4}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #cfd6e2",
                        color: "#111418"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="result-row">
              <div>
                <button
                  type="button"
                  disabled={
                    rolling || !selectedGroup?.isSubmitted || selectedGroup?.rouletteDone
                  }
                  onClick={handleRoulette}
                  className="button-primary h-20 w-full text-2xl"
                >
                  {selectedGroup?.rouletteDone
                    ? isFinalPhase
                      ? "최종 결과 확인 완료"
                      : "미래의 나 공개 완료"
                    : rolling
                      ? "미래의 나 공개 중"
                      : isFinalPhase
                        ? "최종 결과 확인"
                        : "미래의 나 카드 공개"}
                </button>

                <div className="metric-card mt-5 text-center">
                  <p className="text-lg font-bold muted">공개된 위치</p>
                  <p className="mt-3 text-4xl font-black text-brand">
                    {selectedGroup?.assignedClass?.label ?? slotText}
                  </p>
                </div>

                <FutureSelfPanel selectedGroup={selectedGroup} />
              </div>

              {selectedGroup?.result ? (
                <div className="result-score-layout">
                  <div className="result-score-grid">
                    <ScoreCard
                      label="빈곤층 생존 지수"
                      value={selectedGroup.result.survivalIndex}
                    />
                    <ScoreCard
                      label="상류층 자산 성장률"
                      value={selectedGroup.result.assetGrowth}
                      suffix="%"
                    />
                    <ScoreCard
                      label="사회 통합도"
                      value={selectedGroup.result.socialIntegration}
                    />

                    <div className="metric-card result-final-card">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-black">
                          최종 판정: {selectedGroup.result.classResult.label}
                        </h3>
                      </div>
                      <p className="mt-2 text-3xl font-black text-brand">
                        {selectedGroup.result.classResult.score}점
                      </p>
                      <p className="mt-3 font-serif text-lg leading-8 text-[var(--color-text)]">
                        {selectedGroup.result.classResult.message}
                      </p>
                    </div>
                  </div>

                  <div className="metric-card result-radial-card">
                    <ResponsiveContainer width="100%" height={170}>
                      <RadialBarChart
                        innerRadius="35%"
                        outerRadius="95%"
                        data={[
                          {
                            name: "최종 점수",
                            value: selectedGroup.result.classResult.score,
                            fill: "#1B6BFF"
                          }
                        ]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-2xl font-bold text-[var(--color-text-muted)]">
                  {isFinalPhase
                    ? "최종 결과 확인 후 점수가 표시됩니다."
                    : "룰렛 이후 결과 점수가 표시됩니다."}
                </div>
              )}
            </div>
          </section>

          <TeacherEventCards cards={selectedGroup?.result?.eventCards ?? []} />
          <TeacherPresentationCard group={selectedGroup} />

          <ComparisonTable
            groups={groupList}
            selectedGroupId={selectedGroup?.id}
            onSelect={selectGroup}
          />
        </section>
      </div>
    </main>
  );
}
