import { useEffect, useMemo, useRef, useState } from "react";
import {
  SESSION_PHASES,
  getPhaseDefaultSeconds,
  getTaxPolicy,
  getBudgetDirection,
  getWagePolicy,
  useGameData
} from "./useGameData";
import { getAppPath } from "./routes";

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

const formatTaxPolicy = constitution => getTaxPolicy(constitution).label;

const formatBudgetDirection = constitution =>
  getBudgetDirection(constitution).label;

const formatWagePolicy = constitution => getWagePolicy(constitution).label;

function PolicySummary({ constitution }) {
  return (
    <ul className="policy-summary-list">
      <li>
        <span>세금</span>: {formatTaxPolicy(constitution)}
      </li>
      <li>
        <span>예산 방향</span>: {formatBudgetDirection(constitution)}
      </li>
      <li>
        <span>최저임금</span>: {formatWagePolicy(constitution)}
      </li>
    </ul>
  );
}

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
    "가장 불리한 시민도 버틸 수 있는가?",
    "경제 활동의 자유는 얼마나 남아 있는가?",
    "모두가 이 규칙을 받아들일 수 있는가?",
    "역할 관점 해석",
    "역할 관점 메시지"
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
    group.result ? getSurvivalInsight(group.result.survivalIndex).status : "",
    group.result ? getFreedomInsight(group.result.assetGrowth).status : "",
    group.result ? getIntegrationInsight(group.result.socialIntegration).status : "",
    group.result?.classResult?.label,
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
  link.download = `WhoAmI_정의로운사회만들기_${pin || "session"}.csv`;
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
    "가장 불리한 시민도 버틸 수 있는가?",
    "경제 활동의 자유는 얼마나 남아 있는가?",
    "모두가 이 규칙을 받아들일 수 있는가?",
    "역할 관점 해석",
    "역할 관점 메시지",
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
      group.result ? getSurvivalInsight(group.result.survivalIndex).status : "",
      group.result ? getFreedomInsight(group.result.assetGrowth).status : "",
      group.result ? getIntegrationInsight(group.result.socialIntegration).status : "",
      group.result?.classResult?.label,
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
  link.download = `WhoAmI_정의로운사회만들기_수업기록_${pin || "session"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getSurvivalInsight = value => {
  if (value >= 80) {
    return {
      title: "가장 불리한 시민도 버틸 수 있는가?",
      status: "\uae30\ubcf8 \uc0dd\ud65c\uc744 \uc9c0\ud0ac \uac00\ub2a5\uc131\uc774 \ub192\uc2b5\ub2c8\ub2e4.",
      body: "\uc0dd\uacc4, \uc758\ub8cc, \uc8fc\uac70 \uac19\uc740 \ucd5c\uc18c \uc0dd\ud65c \uc7a5\uce58\uac00 \ube44\uad50\uc801 \ub450\ud141\uac8c \ub9c8\ub828\ub41c \uc0ac\ud68c\uc785\ub2c8\ub2e4.",
      question: "누가 가장 보호받고, 누가 부담을 느낄까요?"
    };
  }

  if (value >= 60) {
    return {
      title: "가장 불리한 시민도 버틸 수 있는가?",
      status: "\uae30\ubcf8 \uc0dd\ud65c\uc740 \uac00\ub2a5\ud558\uc9c0\ub9cc \ubd88\uc548\uc815\ud55c \uc9c0\uc810\uc774 \ub0a8\uc544 \uc788\uc2b5\ub2c8\ub2e4.",
      body: "\uac00\uc7a5 \ubd88\ub9ac\ud55c \uc704\uce58\uc758 \uc2dc\ubbfc\uc774 \ubc84\ud2f8 \uc218\ub294 \uc788\uc9c0\ub9cc, \uc704\uae30 \uc0c1\ud669\uc5d0\uc11c \ud754\ub4e4\ub9b4 \uac00\ub2a5\uc131\uc774 \uc788\uc2b5\ub2c8\ub2e4.",
      question: "어떤 시민에게 보호가 더 필요하고, 그 비용은 누가 부담하나요?"
    };
  }

  return {
    title: "가장 불리한 시민도 버틸 수 있는가?",
    status: "\uc0dd\ud65c \uc548\uc815 \uc7a5\uce58\uac00 \ubd80\uc871\ud569\ub2c8\ub2e4.",
    body: "\uac00\uc7a5 \ubd88\ub9ac\ud55c \uc704\uce58\uc5d0\uc11c \uc774 \uc0ac\ud68c \uc124\uacc4\ub97c \ubc1b\uc544\ub4e4\uc774\uae30 \uc5b4\ub835\ub2e4\uace0 \ub290\ub084 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    question: "가장 불리한 시민이라면 이 규칙을 받아들일 수 있을까요?"
  };
};

const getFreedomInsight = value => {
  if (value >= 0) {
    return {
      title: "경제 활동의 자유는 얼마나 남아 있는가?",
      status: "\uacbd\uc81c \ud65c\ub3d9\uc758 \uc790\uc720\uac00 \ub109\ub109\ud788 \uc720\uc9c0\ub429\ub2c8\ub2e4.",
      body: "\uc138\uae08\uacfc \uc81c\ub3c4\uac00 \uc790\uc0b0 \ud615\uc131, \ud22c\uc790, \ucc3d\uc5c5 \uc758\uc695\uc744 \ud06c\uac8c \ub204\ub974\uc9c0 \uc54a\ub294 \uc0ac\ud68c\uc785\ub2c8\ub2e4.",
      question: "이 자유가 다른 시민의 생활 안정과도 함께 갈 수 있나요?"
    };
  }

  if (value >= -15) {
    return {
      title: "경제 활동의 자유는 얼마나 남아 있는가?",
      status: "\uacf5\ub3d9\uccb4 \ubd80\ub2f4\uacfc \uc790\uc720\uc758 \uade0\ud615\uc744 \ub530\uc838\ubcfc \uc9c0\uc810\uc785\ub2c8\ub2e4.",
      body: "\ubcf5\uc9c0\uc640 \uc0ac\ud68c \uc548\uc815\uc744 \uc704\ud55c \ubd80\ub2f4\uc774 \uc0dd\uae30\uc9c0\ub9cc, \uacbd\uc81c \ud65c\ub3d9\uc758 \ub3d9\uae30\ub97c \uc644\uc804\ud788 \uaebd\ub294 \uc815\ub3c4\ub294 \uc544\ub2d9\ub2c8\ub2e4.",
      question: "누가 더 자유로워지고, 누가 더 부담을 지나요?"
    };
  }

  return {
    title: "경제 활동의 자유는 얼마나 남아 있는가?",
    status: "\uacbd\uc81c \ud65c\ub3d9\uc758 \uc790\uc720\uc5d0 \ud070 \ubd80\ub2f4\uc774 \uc0dd\uae38 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    body: "\uacf5\ub3d9\uccb4 \ubcf4\uc7a5\uc744 \uac15\ud654\ud55c \ub300\uc2e0, \uc77c\ubd80 \uc2dc\ubbfc\uc740 \ub178\ub825\uc758 \ubcf4\uc0c1\uc774\ub098 \uc790\uc0b0 \ud615\uc131 \uae30\ud68c\uac00 \uc904\uc5c8\ub2e4\uace0 \ub290\ub084 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    question: "평등을 위해 줄어든 자유를 어떤 시민이 가장 크게 느낄까요?"
  };
};

const getIntegrationInsight = value => {
  if (value >= 80) {
    return {
      title: "모두가 이 규칙을 받아들일 수 있는가?",
      status: "\uc11c\ub85c \uac19\uc740 \uaddc\uce59\uc744 \ubc1b\uc544\ub4e4\uc77c \uac00\ub2a5\uc131\uc774 \ub192\uc2b5\ub2c8\ub2e4.",
      body: "\uacc4\uce35 \uac04 \uaca9\ucc28\uc640 \uac08\ub4f1\uc774 \ube44\uad50\uc801 \ub0ae\uc544, \uc0ac\ud68c \uad6c\uc131\uc6d0\uc774 \uac19\uc740 \uc81c\ub3c4\ub97c \uacf5\uc815\ud558\ub2e4\uace0 \ub290\ub084 \uc5ec\uc9c0\uac00 \ud07d\ub2c8\ub2e4.",
      question: "다른 역할의 시민도 이 규칙을 공정하다고 느낄까요?"
    };
  }

  if (value >= 60) {
    return {
      title: "모두가 이 규칙을 받아들일 수 있는가?",
      status: "\uac08\ub4f1\uc744 \uc904\uc77c \uc7a5\uce58\uac00 \uc788\uc9c0\ub9cc \ubcf4\uc644\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.",
      body: "\uc0ac\ud68c \uc804\uccb4\uac00 \ud06c\uac8c \ud754\ub4e4\ub9ac\uc9c0\ub294 \uc54a\uc9c0\ub9cc, \uc77c\ubd80 \uacc4\uce35\uc740 \ubd80\ub2f4\uacfc \ud61c\ud0dd\uc758 \ubc30\ubd84\uc744 \ubd88\uacf5\uc815\ud558\ub2e4\uace0 \ub290\ub084 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
      question: "어떤 시민이 이 제도에 가장 불만을 가질까요?"
    };
  }

  return {
    title: "모두가 이 규칙을 받아들일 수 있는가?",
    status: "\uc0ac\ud68c\uc801 \uac08\ub4f1\uc774 \ucee4\uc9c8 \uc704\ud5d8\uc774 \uc788\uc2b5\ub2c8\ub2e4.",
    body: "\uacc4\uce35 \uc0ac\uc774\uc758 \ucc28\uc774\uac00 \ucee4\uc838 \uc11c\ub85c\uac00 \uac19\uc740 \uaddc\uce59\uc744 \uacf5\uc815\ud558\ub2e4\uace0 \ubc1b\uc544\ub4e4\uc774\uae30 \uc5b4\ub824\uc6b8 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
    question: "누구에게 혜택이 가고, 누구에게 부담이 커졌나요?"
  };
};

function InterpretationCard({ insight }) {
  return (
    <article className="interpretation-card">
      <p className="panel-label">{insight.title}</p>
      <h3>{insight.status}</h3>
      <p>{insight.body}</p>
      <strong>{insight.question}</strong>
    </article>
  );
}

function TimerStartPanel({
  groupLocked,
  isRunning,
  phase,
  remainingSeconds,
  defaultSeconds,
  onStart,
  onSetTime
}) {
  const [minutesInput, setMinutesInput] = useState("");
  const phaseName = phaseLabel(phase);

  const applyMinutes = event => {
    event.preventDefault();
    if (minutesInput.trim() === "") return;
    const minutes = Number(minutesInput);
    if (!Number.isFinite(minutes) || minutes < 0) return;
    onSetTime(Math.round(minutes * 60));
    setMinutesInput("");
  };

  return (
    <section className="panel timer-panel">
      <div className="timer-panel-grid">
        <div>
          <p className="panel-label">수업 타이머</p>
          <h2 className="panel-heading">
            {isRunning ? "진행 중" : "시작 대기"}
          </h2>
          <p className="mt-2 text-sm font-bold muted">
            {phaseName} 기본값은 {formatTime(defaultSeconds)}입니다. 수업 상황에 맞춰 남은 시간을 바로 조정할 수 있습니다.
          </p>
        </div>

        <div className="timer-action-area">
          <div className="metric-card timer-metric text-center">
            <p className="panel-label">남은 시간</p>
            <p className="mt-1 font-sans text-4xl font-black text-brand tabular-nums">
              {formatTime(remainingSeconds)}
            </p>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={!groupLocked || isRunning}
            className="button-primary timer-start-button text-lg"
          >
            {isRunning ? "시작됨" : "수업 시작"}
          </button>
        </div>
      </div>

      <div className="timer-adjust-row">
        <button type="button" className="timer-adjust-button" onClick={() => onSetTime(remainingSeconds - 60)}>
          -1분
        </button>
        <button type="button" className="timer-adjust-button" onClick={() => onSetTime(remainingSeconds + 60)}>
          +1분
        </button>
        <button type="button" className="timer-adjust-button" onClick={() => onSetTime(defaultSeconds)}>
          기본값
        </button>
        <form className="timer-custom-form" onSubmit={applyMinutes}>
          <input
            type="number"
            min="0"
            max="90"
            step="1"
            value={minutesInput}
            onChange={event => setMinutesInput(event.target.value)}
            placeholder="분"
            aria-label="남은 시간 분 단위 입력"
          />
          <button type="submit" className="button-secondary">
            적용
          </button>
        </form>
      </div>

      {!groupLocked && (
        <p className="info-callout mt-4 text-base">
          먼저 입장한 모둠을 확정하면 타이머를 시작할 수 있습니다.
        </p>
      )}
    </section>
  );
}


function PhaseControls({ phase, onChange }) {
  const nextPhase = getNextPhase(phase);

  return (
    <section className="panel lesson-flow-panel">
      <div className="lesson-flow-header">
        <div>
          <p className="panel-label">수업 흐름</p>
          <h2 className="panel-heading mt-1">현재 단계: {phaseLabel(phase)}</h2>
          <p className="mt-2 font-bold muted">
            토론 → 1차 설계 → 역할 공개 → 2차 토론 → 2차 설계 → 발표
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
      </div>

      <div className="phase-grid mt-5">
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
    </section>
  );
}

const getNextPhase = phase => {
  const currentIndex = SESSION_PHASES.findIndex(item => item.key === phase);
  if (currentIndex < 0) return SESSION_PHASES[0];
  return SESSION_PHASES[currentIndex + 1] ?? null;
};


function TeacherEventCards({ cards = [] }) {
  if (!cards.length) return null;

  return (
    <section className="panel">
      <p className="panel-label">오늘의 사회 뉴스</p>
      <h2 className="panel-heading mt-1">우리 사회 설계가 만든 사건</h2>
      <div className="event-grid mt-5">
        {cards.map((card, index) => (
          <article key={`${card.title}-${index}`} className={`event-card ${card.type ?? "mixed"}`}>
            <p className="event-card-label">사건 {index + 1}</p>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <strong>{card.question}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}


function FutureSelfPanel({ selectedGroup }) {
  const futureSelf = selectedGroup?.assignedClass;

  if (!futureSelf) {
    return (
      <div className="metric-card">
        <p className="panel-label">무지의 베일</p>
        <p className="mt-2 font-bold">
          아직 이 모둠의 미래 위치는 공개되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="future-card teacher-future-card">
      <div>
        <p className="panel-label">공개된 미래의 나</p>
        <h3 className="panel-heading mt-1">{futureSelf.label}</h3>
        <p className="mt-3 font-bold text-[var(--color-text)]">
          {futureSelf.headline ?? "공개된 역할에서 사회 제도의 영향을 다시 살펴봅니다."}
        </p>
        <p className="mt-3 text-lg leading-8 text-[var(--color-text)]">
          {futureSelf.situation ??
            "이 역할의 시민에게 세금, 예산, 최저임금 선택이 어떤 이익과 부담을 만드는지 토론해 보세요."}
        </p>
      </div>

      <div className="future-detail-grid">
        <div className="metric-card future-priority-card">
          <p className="panel-label">내가 특히 따져볼 기준</p>
          <p className="mt-2 font-bold">
            {futureSelf.priority ?? "생활 안정, 기회, 공정한 부담"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ groups, selectedGroupId, onSelect }) {
  return (
    <section className="panel">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="panel-label">전체 비교</p>
          <h2 className="panel-heading">모둠별 선택 변화</h2>
        </div>
        <p className="text-sm font-bold muted">
          행을 누르면 발표 모둠으로 선택됩니다.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table comparison-table">
          <thead>
            <tr>
              <th rowSpan="2">모둠</th>
              <th rowSpan="2">상태</th>
              <th colSpan="3" className="text-center">1차 제출</th>
              <th rowSpan="2">공개된 역할</th>
              <th colSpan="3" className="text-center">2차 제출</th>
            </tr>
            <tr>
              <th>세금</th>
              <th>예산 방향</th>
              <th>최저임금</th>
              <th>세금</th>
              <th>예산 방향</th>
              <th>최저임금</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const active = group.id === selectedGroupId;
              const firstRound = group.history?.[0];
              const firstConstitution =
                firstRound?.constitution ??
                (group.isSubmitted || group.result ? group.constitution : null);
              const secondConstitution = firstRound && group.isSubmitted
                ? group.constitution
                : null;
              const roleLabel =
                group.assignedClass?.label ?? firstRound?.assignedClass?.label ?? "-";

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
                  <td>{firstConstitution ? formatTaxPolicy(firstConstitution) : "-"}</td>
                  <td>{firstConstitution ? formatBudgetDirection(firstConstitution) : "-"}</td>
                  <td>{firstConstitution ? formatWagePolicy(firstConstitution) : "-"}</td>
                  <td className="role-cell">{roleLabel}</td>
                  <td>{secondConstitution ? formatTaxPolicy(secondConstitution) : "-"}</td>
                  <td>{secondConstitution ? formatBudgetDirection(secondConstitution) : "-"}</td>
                  <td>{secondConstitution ? formatWagePolicy(secondConstitution) : "-"}</td>
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
    setTimerSeconds,
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
  const discussionReviewPhase = phase === "secondDiscussion" || phase === "revision";
  const displayResult = selectedGroup?.result ?? (discussionReviewPhase ? selectedGroup?.history?.[0]?.result : null);
  const resultActionLabel = phase === "secondDiscussion"
    ? "2차 토론 진행 중"
    : phase === "revision"
      ? "2차 설계 진행 중"
      : selectedGroup?.rouletteDone
      ? isFinalPhase
        ? "2차 설계 결과 확인 완료"
        : "미래의 나 공개 완료"
      : rolling
        ? "미래의 나 공개 중"
        : isFinalPhase
          ? "2차 설계 결과 확인"
          : "미래의 나 공개";
  const canOpenPresentation = Boolean(selectedGroup?.history?.[0] && selectedGroup?.isSubmitted);
  const defaultPhaseSeconds = getPhaseDefaultSeconds(phase);

  const handleCreate = async () => {
    if (autoCreateRef.current) return;
    autoCreateRef.current = true;

    try {
      const created = await createSession({
        durationSeconds: getPhaseDefaultSeconds("discussion")
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

  const openStudentPreview = () => {
    const previewUrl = getAppPath({
      role: "student",
      pin,
      preview: "1"
    });
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const openPresentationView = () => {
    if (!selectedGroup?.id || !canOpenPresentation) return;

    const presentationUrl = getAppPath({
      role: "student",
      pin,
      groupId: selectedGroup.id,
      presentation: "1"
    });
    window.open(presentationUrl, "_blank", "noopener,noreferrer");
  };

  const openPresentationPreview = () => {
    const presentationUrl = getAppPath({
      role: "student",
      presentation: "1",
      example: "1"
    });
    window.open(presentationUrl, "_blank", "noopener,noreferrer");
  };

  const handleSetTime = async seconds => {
    const result = await setTimerSeconds(seconds);
    if (!result.ok) {
      setSetupMessage("세션을 찾을 수 없어 시간을 조정하지 못했습니다.");
      return;
    }

    setSetupMessage(`남은 시간을 ${formatTime(result.durationSeconds)}로 조정했습니다.`);
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
            <h1>Who am I : 정의로운 사회 만들기 PIN {pin}</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={openStudentPreview}
            className="button-secondary h-12 px-4 text-sm"
          >
            학생용 화면 보기
          </button>
          <button
            type="button"
            onClick={openPresentationPreview}
            className="button-secondary h-12 px-4 text-sm"
          >
            발표 화면 미리보기
          </button>
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
          <div className="sidebar-heading-row">
            <div>
              <p className="panel-label">참여 모둠</p>
              <h2 className="panel-heading">모둠 현황</h2>
            </div>
            <button
              type="button"
              onClick={handleFinalizeGroups}
              disabled={groupLocked || connectedCount === 0}
              className="button-primary sidebar-lock-button"
            >
              {groupLocked ? "확정" : "모둠 확정"}
            </button>
          </div>

          <p className="sidebar-helper">
            {groupLocked
              ? `${groupList.length}개 모둠 확정 완료`
              : `${connectedCount}/${groupList.length} 입장`}
          </p>

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
          <TimerStartPanel
            groupLocked={groupLocked}
            isRunning={isRunning}
            phase={phase}
            remainingSeconds={remainingSeconds}
            defaultSeconds={defaultPhaseSeconds}
            onStart={handleStartSession}
            onSetTime={handleSetTime}
          />

          {setupMessage && (
            <p className="status-callout text-base">
              {setupMessage}
            </p>
          )}

          <PhaseControls phase={phase} onChange={setPhase} />

          <section className="panel">
            <div className="result-panel-header">
              <div>
                <p className="panel-label">선택한 모둠</p>
                <h2 className="panel-heading mt-1">{selectedGroup?.name ?? "모둠 선택"} 활동 결과</h2>
              </div>
              <div className="result-header-actions">
                <p className="text-sm font-bold muted">
                  2차 설계 제출 후 발표 자료를 새 탭으로 열 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={openPresentationView}
                  disabled={!canOpenPresentation}
                  className="button-secondary h-12 px-4 text-sm"
                >
                  발표 자료 보기
                </button>
              </div>
            </div>
            <div className="result-overview mt-5">
              <div className="result-action-row">
                <button
                  type="button"
                  disabled={
                    rolling || !selectedGroup?.isSubmitted || selectedGroup?.rouletteDone || phase === "secondDiscussion" || phase === "revision"
                  }
                  onClick={handleRoulette}
                  className="button-primary h-20 w-full text-2xl"
                >
                  {resultActionLabel}
                </button>

                <div className="metric-card text-center">
                  <p className="text-lg font-bold muted">공개된 역할</p>
                  <p className="mt-3 text-4xl font-black text-brand">
                    {selectedGroup?.assignedClass?.label ?? slotText}
                  </p>
                </div>
              </div>

              <FutureSelfPanel selectedGroup={selectedGroup} />

              {displayResult ? (
                <div className="result-score-layout narrative-result-layout">
                  <div className="result-score-grid narrative-result-grid">
                    <InterpretationCard
                      insight={getSurvivalInsight(displayResult.survivalIndex)}
                    />
                    <InterpretationCard
                      insight={getFreedomInsight(displayResult.assetGrowth)}
                    />
                    <InterpretationCard
                      insight={getIntegrationInsight(displayResult.socialIntegration)}
                    />

                    <div className="interpretation-card result-final-card narrative-final-card role-reflection-card">
                      <p className="panel-label">역할 공개 후 성찰</p>
                      <h3>
                        내 역할에서 바라본 1차 설계
                      </h3>
                      <p>
                        {displayResult.classResult.label} 입장에서 보면 {displayResult.classResult.message}
                      </p>
                      <strong>
                        이 설계가 나에게 어떤 이익과 부담으로 느껴지는지, 그리고 다른 위치의 시민에게도 설명 가능한지 따져보세요.
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-result-panel">
                  {isFinalPhase
                    ? "2차 설계 결과 확인 후 결과가 표시됩니다."
                    : "역할 공개 이후 우리 선택이 만든 결과가 표시됩니다."}
                </div>
              )}
            </div>
          </section>

          <TeacherEventCards cards={displayResult?.eventCards ?? []} />

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
