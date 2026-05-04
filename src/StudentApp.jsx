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

const formatPolicySummary = constitution =>
  `세금 ${formatTaxPolicy(constitution)} · 예산 방향 ${formatBudgetDirection(
    constitution
  )} · 최저임금 ${formatWagePolicy(constitution)}`;

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

function FutureSelfCard({ group, phase }) {
  const futureSelf = group?.assignedClass;
  const result = group?.result;
  const revealed = Boolean(futureSelf);

  if (!revealed) {
    return (
      <section className="veil-card">
        <div>
          <p className="panel-label">무지의 베일</p>
          <h2 className="panel-heading mt-1">아직 우리는 누구인지 모릅니다</h2>
          <p className="mt-3 font-serif text-lg leading-8 text-[var(--color-text)]">
            어떤 가정, 어떤 직업, 어떤 소득에서 살아가게 될지 모르는 상태에서
            모두가 받아들일 수 있는 헌법을 정해 보세요.
          </p>
        </div>
        <div className="veil-question">
          내가 가장 불리한 위치에 태어나도 이 규칙을 받아들일 수 있을까?
        </div>
      </section>
    );
  }

  return (
    <section className="future-card">
      <div>
        <p className="panel-label">베일이 걷혔습니다</p>
        <h2 className="panel-heading mt-1">{futureSelf.label}</h2>
        <p className="mt-3 text-lg font-bold text-[var(--color-text)]">
          {futureSelf.headline ?? "공개된 위치에서 헌법의 영향을 다시 살펴보세요."}
        </p>
        <p className="mt-3 font-serif text-lg leading-8 text-[var(--color-text)]">
          {futureSelf.situation ??
            "이 위치의 시민에게 세금, 복지, 최저임금이 어떤 의미인지 토론해 보세요."}
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="metric-card">
          <p className="panel-label">중요한 기준</p>
          <p className="mt-2 font-bold">
            {futureSelf.priority ?? "생활 안정, 기회, 공정한 부담"}
          </p>
        </div>
        <div className="metric-card">
          <p className="panel-label">다시 토론할 질문</p>
          <p className="mt-2 font-bold">
            {futureSelf.question ??
              "이 위치에서 다시 태어나도 이 헌법을 받아들일 수 있나요?"}
          </p>
        </div>
      </div>

      {result && (
        <div className="status-callout mt-5">
          <p className="font-black">
            이 위치에서의 헌법 만족도: {result.classResult.score}점
          </p>
          <p className="mt-2 font-serif leading-7">
            {result.classResult.message}
          </p>
        </div>
      )}

      {phase === "revision" && (
        <div className="info-callout mt-5">
          <div className="font-extrabold text-brand">?</div>
          <div>
            <p className="font-black">2차 토론</p>
            <p className="info-callout-body mt-1">
              이제 공개된 위치를 기준으로, 처음 만든 헌법이 정말 공정했는지
              검토하고 필요한 조항을 조정하세요.
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
      <p className="panel-label">오늘의 사회 뉴스</p>
      <h2 className="panel-heading mt-1">우리 헌법이 만든 사건</h2>
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

function PresentationCard({ group }) {
  const firstRound = group?.history?.[0];
  const result = group?.result;

  if (!firstRound && !result) return null;

  return (
    <section className="panel mt-6">
      <p className="panel-label">발표 준비 카드</p>
      <h2 className="panel-heading mt-1">우리 모둠 발표 흐름</h2>
      <div className="presentation-grid mt-5">
        <div>
          <p className="panel-label">1차 헌법</p>
          <p>{formatPolicySummary(firstRound?.constitution ?? group.constitution)}</p>
        </div>
        <div>
          <p className="panel-label">미래의 나</p>
          <p>{group.assignedClass?.label ?? firstRound?.assignedClass?.label ?? "아직 공개 전"}</p>
        </div>
        <div>
          <p className="panel-label">최종 헌법</p>
          <p>{formatPolicySummary(group.constitution)}</p>
        </div>
        <div>
          <p className="panel-label">발표 질문</p>
          <p>우리 헌법은 무지의 베일 뒤에서도 공정하다고 말할 수 있나요?</p>
        </div>
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

export default function StudentApp({ pin, groupId }) {
  const {
    group,
    loading,
    phase,
    inputOpen,
    remainingSeconds,
    connectGroup,
    updateConstitution,
    submitConstitution
  } = useGameData(pin, groupId);

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
    connectGroup();
  }, []);

  useEffect(() => {
    if (group?.constitution) {
      const taxPolicy = getTaxPolicy(group.constitution);
      const budgetDirection = getBudgetDirection(group.constitution);
      const wagePolicy = getWagePolicy(group.constitution);
      setConstitution({
        ...group.constitution,
        taxPolicy: taxPolicy.key,
        taxRate: taxPolicy.taxRate,
        budgetDirection: budgetDirection.key,
        welfareBudget: budgetDirection.welfareBudget,
        wagePolicy: wagePolicy.key,
        minimumWage: wagePolicy.minimumWage
      });
    }
  }, [group?.constitution]);

  useEffect(() => {
    if (inputOpen && !group?.isSubmitted) {
      setCheckedItems([]);
    }
  }, [phase, group?.isSubmitted, inputOpen]);

  const submitted = Boolean(group?.isSubmitted);
  const controlsDisabled = submitted || !inputOpen;
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
      allChecked
    );
  }, [constitution, inputOpen, allChecked]);

  const changeValue = async patch => {
    const next = { ...constitution, ...patch };
    setConstitution(next);
    await updateConstitution(next);
  };

  const handleSubmit = async () => {
    await submitConstitution(constitution);
  };

  if (loading) {
    return (
      <main className="center-page app-page text-3xl font-bold text-brand">
        헌법 회의장에 입장 중
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
      <header className="student-header">
        <div className="flex items-center gap-4">
          <div className="brand-logo">붕</div>
          <div>
            <p className="brand-kicker">헌법 제정 회의</p>
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
      <EventCards cards={group?.result?.eventCards ?? []} />
      <PresentationCard group={group} />

      {!inputOpen && !submitted && (
        <div className="danger-callout mt-6 text-xl">
          지금은 정책을 제출하는 단계가 아닙니다. 교사의 안내를 기다려 주세요.
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
          {submitted ? "헌법 제출 완료" : "이 헌법으로 제출하기"}
        </button>
      </footer>
      </div>
    </main>
  );
}
