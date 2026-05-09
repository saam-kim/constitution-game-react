import { useEffect, useMemo, useState } from "react";
import {
  BUDGET_DIRECTION_OPTIONS,
  SESSION_PHASES,
  TAX_POLICY_OPTIONS,
  WAGE_POLICY_OPTIONS,
  getTaxPolicy,
  getBudgetDirection,
  getWagePolicy,
  useGameData
} from "./useGameData";

const formatTime = seconds => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

const getPhaseLabel = phase =>
  SESSION_PHASES.find(item => item.key === phase)?.label ?? "토론";

const POLICY_INFO = {
  taxRate: {
    title: "세금 정책 방향",
    body:
      "세금을 낮게 둘지, 모두가 넓게 부담할지, 소득이 높은 사람이 더 책임질지 정합니다. 자유와 공동체 책임을 함께 따져 보세요."
  },
  welfareBudget: {
    title: "국가 예산 방향",
    body:
      "국가 예산을 성장, 기본 생활 보장, 기회 투자 중 어디에 우선 둘지 정합니다. 자유로운 경제 활동과 평등한 출발 조건을 함께 따져 보세요."
  },
  minimumWage: {
    title: "최저임금 방향",
    body:
      "임금을 시장에 더 맡길지, 천천히 올릴지, 기본 생활을 보장할 만큼 높게 둘지 정합니다. 일자리 기회와 생활 안정을 함께 보세요."
  }
};

const SUBMIT_CHECKS = [
  "가장 불리한 위치에 태어나도 받아들일 수 있는 규칙인가요?",
  "세금 부담과 예산 방향을 납득할 수 있게 정했나요?",
  "최저임금 방향이 노동자와 고용자 모두에게 감당 가능한가요?"
];

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

function PolicyInfo({ item }) {
  return (
    <div className="info-callout">
      <div className="font-extrabold text-brand">?</div>
      <div>
        <p className="font-black">{item.title}</p>
        <p className="info-callout-body mt-1">
          {item.body}
        </p>
      </div>
    </div>
  );
}

function getStudentInsights(result) {
  if (!result) return [];

  const survivalStatus =
    result.survivalIndex >= 80
      ? "\uac00\uc7a5 \ubd88\ub9ac\ud55c \uc2dc\ubbfc\ub3c4 \uae30\ubcf8 \uc0dd\ud65c\uc744 \uc9c0\ud0ac \uac00\ub2a5\uc131\uc774 \ud07d\ub2c8\ub2e4."
      : result.survivalIndex >= 60
        ? "\uae30\ubcf8 \uc0dd\ud65c\uc740 \uac00\ub2a5\ud558\uc9c0\ub9cc \ubd88\uc548\uc815\ud55c \ubd80\ubd84\uc774 \ub0a8\uc544 \uc788\uc2b5\ub2c8\ub2e4."
        : "\uac00\uc7a5 \ubd88\ub9ac\ud55c \uc704\uce58\uc5d0\uc11c\ub294 \uc0dd\ud65c \uc548\uc815\uc774 \ubd80\uc871\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.";

  const freedomStatus =
    result.assetGrowth >= 0
      ? "\uacbd\uc81c \ud65c\ub3d9\uc758 \uc790\uc720\uac00 \ub110\ub110\ud788 \uc720\uc9c0\ub429\ub2c8\ub2e4."
      : result.assetGrowth >= -15
        ? "\uacf5\ub3d9\uccb4 \ubd80\ub2f4\uacfc \uacbd\uc81c \ud65c\ub3d9\uc758 \uc790\uc720\ub97c \ud568\uaed8 \ub530\uc838\ubcfc \ud544\uc694\uac00 \uc788\uc2b5\ub2c8\ub2e4."
        : "\uc0ac\ud68c\uc801 \ubcf4\uc7a5\uc744 \uac15\ud654\ud55c \ub300\uc2e0 \uacbd\uc81c \ud65c\ub3d9\uc5d0 \ud070 \ubd80\ub2f4\uc774 \uc0dd\uae38 \uc218 \uc788\uc2b5\ub2c8\ub2e4.";

  const integrationStatus =
    result.socialIntegration >= 80
      ? "\uc11c\ub85c \uac19\uc740 \uaddc\uce59\uc744 \ubc1b\uc544\ub4e4\uc77c \uac00\ub2a5\uc131\uc774 \ud07d\ub2c8\ub2e4."
      : result.socialIntegration >= 60
        ? "\ud568\uaed8 \uc0b4\uc544\uac08 \uc218 \uc788\uc9c0\ub9cc \uac08\ub4f1\uc744 \uc904\uc77c \ubcf4\uc644\uc774 \ud544\uc694\ud569\ub2c8\ub2e4."
        : "\uc11c\ub85c\uac00 \uac19\uc740 \uaddc\uce59\uc744 \uacf5\uc815\ud558\ub2e4\uace0 \ubc1b\uc544\ub4e4\uc774\uae30 \uc5b4\ub824\uc6b8 \uc218 \uc788\uc2b5\ub2c8\ub2e4.";

  return [
    {
      title: "가장 불리한 시민도 버틸 수 있는가?",
      status: survivalStatus,
      question: "누가 가장 보호받고, 누가 부담을 느낄까요?"
    },
    {
      title: "경제 활동의 자유는 얼마나 남아 있는가?",
      status: freedomStatus,
      question: "누가 더 자유로워지고, 누가 더 부담을 지나요?"
    },
    {
      title: "모두가 이 규칙을 받아들일 수 있는가?",
      status: integrationStatus,
      question: "다른 위치의 시민도 이 규칙을 납득할 수 있을까요?"
    }
  ];
}

function StudentInsightCards({ result }) {
  const insights = getStudentInsights(result);
  if (!insights.length) return null;

  return (
    <section className="panel mt-6">
      <p className="panel-label">{"우리 선택이 만든 결과"}</p>
      <h2 className="panel-heading mt-1">{"1차 설계 결과 살펴보기"}</h2>
      <div className="student-insight-grid mt-5">
        {insights.map(insight => (
          <article key={insight.title} className="interpretation-card student-insight-card">
            <p className="panel-label">{insight.title}</p>
            <h3>{insight.status}</h3>
            <strong>{insight.question}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function FutureSelfCard({ group, phase }) {
  const futureSelf = group?.assignedClass;
  const result = group?.result ?? group?.history?.[0]?.result;
  const revealed = Boolean(futureSelf);

  if (!revealed) {
    return (
      <section className="veil-card">
        <div>
          <p className="panel-label">{"\ubb34\uc9c0\uc758 \ubca0\uc77c"}</p>
          <h2 className="panel-heading mt-1">{"\uc544\uc9c1 \uc6b0\ub9ac\ub294 \ub204\uad6c\uc778\uc9c0 \ubaa8\ub985\ub2c8\ub2e4"}</h2>
          <p className="mt-3 text-lg leading-8 text-[var(--color-text)]">
            {"\ub0b4\uac00 \uc5b4\ub5a4 \uc704\uce58\uc5d0\uc11c \uc0b4\uac8c \ub420\uc9c0 \ubaa8\ub974\ub294 \uc0c1\ud0dc\uc5d0\uc11c \ubaa8\ub450\uac00 \ubc1b\uc544\ub4e4\uc77c \uc218 \uc788\ub294 \uc0ac\ud68c \uc6d0\uce59\uc744 \uc815\ud574 \ubcf4\uc138\uc694."}
          </p>
        </div>
        <div className="veil-question">
          {"\ub0b4\uac00 \uac00\uc7a5 \ubd88\ub9ac\ud55c \uc704\uce58\uc5d0 \ud0dc\uc5b4\ub098\ub3c4 \uc774 \uaddc\uce59\uc744 \ubc1b\uc544\ub4e4\uc77c \uc218 \uc788\uc744\uae4c?"}
        </div>
      </section>
    );
  }

  return (
    <section className="future-card">
      <div>
        <p className="panel-label">{"\ubca0\uc77c\uc774 \uac77\ud614\uc2b5\ub2c8\ub2e4"}</p>
        <h2 className="panel-heading mt-1">{futureSelf.label}</h2>
        <p className="mt-3 text-lg font-bold text-[var(--color-text)]">
          {futureSelf.headline ?? "공개된 역할에서 사회 제도의 영향을 다시 살펴보세요."}
        </p>
        <p className="mt-3 text-lg leading-8 text-[var(--color-text)]">
          {futureSelf.situation ??
            "이 역할의 시민에게 세금, 예산, 최저임금 선택이 어떤 이익과 부담을 만드는지 토론해 보세요."}
        </p>
      </div>

      <div className="mt-5">
        <div className="metric-card">
          <p className="panel-label">{"내가 특히 따져볼 기준"}</p>
          <p className="mt-2 font-bold">
            {futureSelf.priority ?? "\uc0dd\ud65c \uc548\uc815, \uae30\ud68c, \uacf5\uc815\ud55c \ubd80\ub2f4"}
          </p>
        </div>
      </div>

      {result && (
        <div className="status-callout mt-5">
          <p className="font-black">{"내 역할에서 바라본 1차 설계"}</p>
          <p className="mt-2 leading-7">
            {result.classResult.message}
          </p>
        </div>
      )}

      {(phase === "secondDiscussion" || phase === "revision") && (
        <div className="info-callout mt-5">
          <div className="font-extrabold text-brand">?</div>
          <div>
            <p className="font-black">{"2\ucc28 \ud1a0\ub860"}</p>
            <p className="info-callout-body mt-1">
              {"역할과 사건 카드를 바탕으로 처음 만든 사회 설계가 정말 공정했는지 검토하세요."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function EventCards({ cards = [] }) {
  if (!cards.length) return null;

  return (
    <section className="panel mt-6">
      <div className="event-section-header">
        <div>
          <p className="panel-label">{"\uc624\ub298\uc758 \uc0ac\ud68c \ub274\uc2a4"}</p>
          <h2 className="panel-heading mt-1">{"\uc6b0\ub9ac \uc0ac\ud68c \uc124\uacc4\uac00 \ub9cc\ub4e0 \uc0ac\uac74"}</h2>
        </div>
        <div className="event-reflection-callout">
          {"내 역할 말고 다른 시민 한 명을 골라 보세요. 그 시민도 이 사회를 공정하다고 느낄 수 있을까요?"}
        </div>
      </div>
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

function PresentationStepCard({ label, children, prompt }) {
  return (
    <div className="presentation-card-item">
      <div className="presentation-card-content">
        <p className="panel-label">{label}</p>
        {children}
      </div>
      <div className="presentation-card-prompt">{prompt}</div>
    </div>
  );
}

function NewsSummary({ cards = [] }) {
  if (!cards.length) {
    return <p>{"\uc0ac\uac74 \uce74\ub4dc\uac00 \uacf5\uac1c\ub418\uba74 \ud55c \uac00\uc9c0\ub97c \uace8\ub77c \uc815\ub9ac\ud558\uc138\uc694."}</p>;
  }

  return (
    <ul className="news-summary-list">
      {cards.slice(0, 3).map((card, index) => (
        <li key={`${card.title}-${index}`}>사건 {index + 1}: {card.title}</li>
      ))}
    </ul>
  );
}

function PresentationCard({ group }) {
  const firstRound = group?.history?.[0];
  const result = group?.result ?? group?.history?.[0]?.result;
  const eventCards = result?.eventCards ?? [];

  if (!firstRound && !result) return null;

  return (
    <section className="panel mt-6">
      <p className="panel-label">{"\ubc1c\ud45c \uc900\ube44 \uce74\ub4dc"}</p>
      <h2 className="panel-heading mt-1">{"\uc6b0\ub9ac \ubaa8\ub460 \ubc1c\ud45c \ud750\ub984"}</h2>
      <div className="presentation-grid mt-5">
        <PresentationStepCard
          label={"1\ucc28 \uc124\uacc4"}
          prompt={"\uc65c \uc774 \uc120\ud0dd\uc744 \ud588\ub294\uc9c0, \ub2e4\ub978 \uc120\ud0dd\uc744 \ud558\uc9c0 \uc54a\uc740 \uc774\uc720\ub97c \uc124\uba85\ud558\uc138\uc694."}
        >
          <PolicySummary constitution={firstRound?.constitution ?? group.constitution} />
        </PresentationStepCard>

        <PresentationStepCard
          label={"\ubbf8\ub798\uc758 \ub098"}
          prompt={"1\ucc28 \uc124\uacc4\uac00 \ub098\uc758 \uc0dd\ud65c\uc5d0 \uc5b4\ub5a4 \uc601\ud5a5\uc744 \uc8fc\uc5c8\ub294\uc9c0 \ub9d0\ud558\uc138\uc694."}
        >
          <p>{group.assignedClass?.label ?? firstRound?.assignedClass?.label ?? "\uc544\uc9c1 \uacf5\uac1c \uc804"}</p>
        </PresentationStepCard>

        <PresentationStepCard
          label={"\uc624\ub298\uc758 \uc0ac\ud68c \ub274\uc2a4"}
          prompt={"사건 하나를 골라, 이 사회가 누구에게 유리하고 불리한지 설명하세요."}
        >
          <NewsSummary cards={eventCards} />
        </PresentationStepCard>

        <PresentationStepCard
          label={"2\ucc28 \uc124\uacc4"}
          prompt={"\ub2ec\ub77c\uc9c4 \uc120\ud0dd\uc740 \ubb34\uc5c7\uc774\uace0 \uc65c \ubc14\uafb8\uc5c8\ub294\uc9c0, \uc720\uc9c0\ud55c \uc120\ud0dd\uc740 \uc65c \uc720\uc9c0\ud588\ub294\uc9c0 \uc124\uba85\ud558\uc138\uc694."}
        >
          <PolicySummary constitution={group.constitution} />
        </PresentationStepCard>
      </div>
    </section>
  );
}


function PolicyChoiceControl({ label, valueLabel, options, selectedKey, info, disabled, onChange }) {
  return (
    <section className="control-card">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="panel-heading">{label}</h2>
        <div className="value-pill value-pill-text">
          {valueLabel}
        </div>
      </div>

      <div className="choice-grid">
        {options.map(option => {
          const active = option.key === selectedKey;

          return (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={`choice-card ${active ? "active" : ""}`}
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          );
        })}
      </div>

      <PolicyInfo item={info} />
    </section>
  );
}

export default function StudentApp({ pin, groupId, preview = false }) {
  const {
    group: liveGroup,
    loading,
    phase,
    inputOpen,
    remainingSeconds,
    connectGroup,
    updateConstitution,
    submitConstitution
  } = useGameData(pin, preview ? null : groupId);

  const [constitution, setConstitution] = useState({
    taxPolicy: "shared",
    taxRate: 35,
    budgetDirection: "opportunity",
    welfareBudget: 28,
    wagePolicy: "gradual",
    minimumWage: 11000
  });
  const [checkedItems, setCheckedItems] = useState([]);

  useEffect(() => {
    if (!preview) {
      connectGroup();
    }
  }, [preview]);

  useEffect(() => {
    if (liveGroup?.constitution) {
      const taxPolicy = getTaxPolicy(liveGroup.constitution);
      const budgetDirection = getBudgetDirection(liveGroup.constitution);
      const wagePolicy = getWagePolicy(liveGroup.constitution);
      setConstitution({
        ...liveGroup.constitution,
        taxPolicy: taxPolicy.key,
        taxRate: taxPolicy.taxRate,
        budgetDirection: budgetDirection.key,
        welfareBudget: budgetDirection.welfareBudget,
        wagePolicy: wagePolicy.key,
        minimumWage: wagePolicy.minimumWage
      });
    }
  }, [liveGroup?.constitution]);

  useEffect(() => {
    if (inputOpen && !liveGroup?.isSubmitted) {
      setCheckedItems([]);
    }
  }, [phase, liveGroup?.isSubmitted, inputOpen]);

  const previewGroup = useMemo(() => ({
    id: "preview",
    name: "학생용 화면 미리보기",
    connected: true,
    isSubmitted: false,
    constitution,
    history: []
  }), [constitution]);
  const group = preview ? previewGroup : liveGroup;
  const visibleResult = group?.result ?? group?.history?.[0]?.result;
  const submitted = Boolean(group?.isSubmitted);
  const controlsDisabled = preview ? false : submitted || !inputOpen;
  const allChecked = new Set(checkedItems).size === SUBMIT_CHECKS.length;

  const canSubmit = useMemo(() => {
    return (
      inputOpen &&
      TAX_POLICY_OPTIONS.some(
        option => option.key === getTaxPolicy(constitution).key
      ) &&
      BUDGET_DIRECTION_OPTIONS.some(
        option => option.key === getBudgetDirection(constitution).key
      ) &&
      WAGE_POLICY_OPTIONS.some(
        option => option.key === getWagePolicy(constitution).key
      ) &&
      allChecked &&
      !preview
    );
  }, [constitution, inputOpen, allChecked, preview]);

  const changeValue = async patch => {
    const next = { ...constitution, ...patch };
    setConstitution(next);
    if (!preview) {
      await updateConstitution(next);
    }
  };

  const handleSubmit = async () => {
    if (preview) return;
    await submitConstitution(constitution);
  };

  if (loading) {
    return (
      <main className="center-page app-page text-3xl font-bold text-brand">
        사회 설계 회의장에 입장 중
      </main>
    );
  }

  if (!group) {
    return (
      <main className="center-page app-page p-6 text-center text-3xl font-bold text-red-700">
        모둠 정보를 찾을 수 없습니다. 이미 모둠이 확정되었거나 PIN을 다시 확인해야 합니다.
      </main>
    );
  }

  return (
    <main className="student-page">
      <div className="student-content">
      {preview && (
        <section className="info-callout mb-5 text-base">
          교사용 미리보기입니다. 이 화면에서는 학생 접속 기록이나 제출 기록이 바뀌지 않습니다.
        </section>
      )}

      <header className="student-header">
        <div className="flex items-center gap-4">
          <div className="brand-logo">붕</div>
          <div>
            <p className="brand-kicker">공정한 사회 설계 회의</p>
            <h1 className="brand-title">{group.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="metric-card text-center">
            <p className="panel-label">현재 단계</p>
            <p className="text-3xl font-black text-brand">
              {getPhaseLabel(phase)}
            </p>
          </div>
          <div className="metric-card text-right">
              <p className="panel-label">입력 마감</p>
              <p className="font-sans text-5xl font-black text-brand tabular-nums">
                {formatTime(remainingSeconds)}
              </p>
          </div>
        </div>
      </header>

      <FutureSelfCard group={group} phase={phase} />
      <StudentInsightCards result={visibleResult} />
      <EventCards cards={visibleResult?.eventCards ?? []} />
      <PresentationCard group={group} />

      {!preview && !inputOpen && !submitted && (
        <div className={`${phase === "secondDiscussion" ? "info-callout" : "danger-callout"} mt-6 text-xl`}>
          {phase === "secondDiscussion"
            ? "지금은 2차 토론 단계입니다. 역할과 사건 카드를 바탕으로 어떤 선택을 바꿀지 먼저 토론하세요."
            : "지금은 정책을 제출하는 단계가 아닙니다. 교사의 안내를 기다려 주세요."}
        </div>
      )}

      <div className="mt-6 grid gap-5">
        <PolicyChoiceControl
          label="세금 정책 방향"
          valueLabel={getTaxPolicy(constitution).shortLabel}
          options={TAX_POLICY_OPTIONS}
          selectedKey={getTaxPolicy(constitution).key}
          info={POLICY_INFO.taxRate}
          disabled={controlsDisabled}
          onChange={option =>
            changeValue({
              taxPolicy: option.key,
              taxRate: option.taxRate
            })
          }
        />

        <PolicyChoiceControl
          label="국가 예산 방향"
          valueLabel={getBudgetDirection(constitution).shortLabel}
          options={BUDGET_DIRECTION_OPTIONS}
          selectedKey={getBudgetDirection(constitution).key}
          info={POLICY_INFO.welfareBudget}
          disabled={controlsDisabled}
          onChange={option =>
            changeValue({
              budgetDirection: option.key,
              welfareBudget: option.welfareBudget
            })
          }
        />

        <PolicyChoiceControl
          label="최저임금 방향"
          valueLabel={getWagePolicy(constitution).shortLabel}
          options={WAGE_POLICY_OPTIONS}
          selectedKey={getWagePolicy(constitution).key}
          info={POLICY_INFO.minimumWage}
          disabled={controlsDisabled}
          onChange={option =>
            changeValue({
              wagePolicy: option.key,
              minimumWage: option.minimumWage
            })
          }
        />
      </div>

      <footer className="mt-6">
        {inputOpen && !submitted && (
          <section className="panel mb-5">
            <p className="panel-label">제출 전 점검</p>
            <h2 className="panel-heading mt-1">무지의 베일 체크리스트</h2>
            <div className="mt-4 grid gap-3">
              {SUBMIT_CHECKS.map((item, index) => {
                const checked = checkedItems.includes(index);

                return (
                  <label key={item} className="check-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={event => {
                        setCheckedItems(current =>
                          event.target.checked
                            ? [...new Set([...current, index])]
                            : current.filter(value => value !== index)
                        );
                      }}
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>
          </section>
        )}
        <button
          type="button"
          disabled={!canSubmit || submitted}
          onClick={handleSubmit}
          className="button-primary flex h-24 w-full items-center justify-center text-4xl"
        >
          {preview ? "미리보기에서는 제출하지 않음" : submitted ? "설계 제출 완료" : "이 설계로 제출하기"}
        </button>
      </footer>
      </div>
    </main>
  );
}
