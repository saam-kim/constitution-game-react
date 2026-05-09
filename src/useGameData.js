import { useEffect, useMemo, useState } from "react";
import {
  get,
  ref,
  set,
  update,
  onValue,
  serverTimestamp,
  runTransaction
} from "firebase/database";
import { database, isFirebaseConfigured } from "./firebase";

export const SESSION_PHASES = [
  { key: "discussion", label: "토론", note: "모둠 입장과 쟁점 확인" },
  { key: "constitution", label: "1차 설계", note: "정책 선택과 제출" },
  { key: "result", label: "역할 공개", note: "미래의 나와 생활 모습 확인" },
  { key: "revision", label: "2차 설계", note: "결과를 바탕으로 재토론" },
  { key: "final", label: "설계 과정 및 결과 발표", note: "수정한 사회 설계 비교와 발표" }
];

export const INPUT_OPEN_PHASES = ["constitution", "revision"];

export const TAX_POLICY_OPTIONS = [
  {
    key: "low",
    label: "낮은 세금형",
    shortLabel: "낮은 세금",
    taxRate: 18,
    description: "개인과 기업이 번 돈을 더 많이 가져가게 해 경제 활동의 자유를 넓힙니다."
  },
  {
    key: "shared",
    label: "공동 부담형",
    shortLabel: "공동 부담",
    taxRate: 35,
    description: "모두가 감당 가능한 수준으로 넓게 부담해 안정적인 공공 재원을 만듭니다."
  },
  {
    key: "ability",
    label: "능력 부담형",
    shortLabel: "능력 부담",
    taxRate: 55,
    description: "소득이 높은 사람이 더 큰 책임을 져 불평등 완화와 공동체 재원을 강화합니다."
  }
];

export const BUDGET_DIRECTION_OPTIONS = [
  {
    key: "growth",
    label: "성장 우선형",
    shortLabel: "성장",
    welfareBudget: 12,
    description: "세금과 복지 지출을 낮추고 기업 활동, 투자, 일자리 확대를 우선합니다."
  },
  {
    key: "basic",
    label: "기본 보장형",
    shortLabel: "기본 보장",
    welfareBudget: 42,
    description: "생계, 의료, 주거처럼 모든 시민의 최소 생활을 두텁게 보장합니다."
  },
  {
    key: "opportunity",
    label: "기회 투자형",
    shortLabel: "기회 투자",
    welfareBudget: 28,
    description: "현금 지원보다 교육, 직업훈련, 돌봄처럼 다시 올라설 기회에 투자합니다."
  }
];

export const WAGE_POLICY_OPTIONS = [
  {
    key: "market",
    label: "시장 자율형",
    shortLabel: "시장 자율",
    minimumWage: 9000,
    description: "임금을 시장과 고용 상황에 더 맡겨 일자리 기회를 우선 고려합니다."
  },
  {
    key: "gradual",
    label: "점진 인상형",
    shortLabel: "점진 인상",
    minimumWage: 11000,
    description: "노동자 보호와 사업자 부담을 함께 보며 최저임금을 천천히 올립니다."
  },
  {
    key: "living",
    label: "생활 보장형",
    shortLabel: "생활 보장",
    minimumWage: 13500,
    description: "일하는 사람이 기본 생활을 할 수 있도록 최저임금을 높게 보장합니다."
  }
];

export const getTaxPolicy = constitution => {
  const key = constitution?.taxPolicy;
  const matched = TAX_POLICY_OPTIONS.find(option => option.key === key);
  if (matched) return matched;

  const taxRate = Number(constitution?.taxRate ?? 35);
  if (taxRate <= 22) return TAX_POLICY_OPTIONS[0];
  if (taxRate >= 50) return TAX_POLICY_OPTIONS[2];
  return TAX_POLICY_OPTIONS[1];
};

export const getBudgetDirection = constitution => {
  const key = constitution?.budgetDirection;
  const matched = BUDGET_DIRECTION_OPTIONS.find(option => option.key === key);
  if (matched) return matched;

  const welfareBudget = Number(constitution?.welfareBudget ?? 25);
  if (welfareBudget < 18) return BUDGET_DIRECTION_OPTIONS[0];
  if (welfareBudget >= 35) return BUDGET_DIRECTION_OPTIONS[1];
  return BUDGET_DIRECTION_OPTIONS[2];
};

export const getWagePolicy = constitution => {
  const key = constitution?.wagePolicy;
  const matched = WAGE_POLICY_OPTIONS.find(option => option.key === key);
  if (matched) return matched;

  const minimumWage = Number(constitution?.minimumWage ?? 11000);
  if (minimumWage <= 9500) return WAGE_POLICY_OPTIONS[0];
  if (minimumWage >= 13000) return WAGE_POLICY_OPTIONS[2];
  return WAGE_POLICY_OPTIONS[1];
};

const DEFAULT_CONSTITUTION = {
  taxPolicy: "shared",
  taxRate: 35,
  budgetDirection: "opportunity",
  welfareBudget: 28,
  wagePolicy: "gradual",
  minimumWage: 11000
};

const CLASS_POOL = [
  { key: "upper", label: "상류층", weight: 20 },
  { key: "middle", label: "중산층", weight: 50 },
  { key: "lower", label: "빈곤층", weight: 30 }
];

export const FUTURE_SELF_CARDS = [
  {
    key: "low_income_teen",
    classKey: "lower",
    label: "저소득 가정의 청소년",
    weight: 18,
    headline: "방과 후 아르바이트와 공부를 함께 해야 하는 학생입니다.",
    situation:
      "가족의 생활비가 빠듯해서 복지와 최저임금 변화가 일상에 바로 영향을 줍니다.",
    priority: "기본 생활 안정, 교육 기회, 의료비 부담 완화",
    question: "이 사회 설계는 가장 불리한 위치의 학생도 존중하고 있나요?"
  },
  {
    key: "small_business_owner",
    classKey: "middle",
    label: "작은 가게를 운영하는 자영업자",
    weight: 18,
    headline: "직원 두 명과 함께 동네 가게를 운영합니다.",
    situation:
      "최저임금과 세금이 너무 빠르게 오르면 고용을 유지하기 어렵지만, 사회가 안정되면 손님도 늘어납니다.",
    priority: "고용 유지, 세금 부담 예측 가능성, 지역 경제 안정",
    question: "이 사회 설계는 일하는 사람과 고용하는 사람의 부담을 함께 보나요?"
  },
  {
    key: "office_worker_parent",
    classKey: "middle",
    label: "아이를 키우는 중산층 직장인",
    weight: 22,
    headline: "매달 월급 안에서 주거비, 교육비, 생활비를 계획해 씁니다.",
    situation:
      "돌봄과 교육 지원은 가계 부담을 덜어 주지만, 세금이 늘면 당장 쓸 수 있는 생활비가 줄어듭니다.",
    priority: "생활 안정, 세금과 복지의 균형, 사회 갈등 완화",
    question: "이 사회 설계는 부담과 혜택을 납득 가능한 방식으로 나누나요?"
  },
  {
    key: "high_income_professional",
    classKey: "upper",
    label: "고소득 전문직",
    weight: 16,
    headline: "높은 소득을 얻지만 세금 부담도 크게 느끼는 시민입니다.",
    situation:
      "높은 세금은 자산 증가를 늦출 수 있지만, 불평등이 줄고 사회가 안정되면 장기적으로 이익을 얻을 수 있습니다.",
    priority: "경제 활동의 자유, 공정한 조세, 사회 신뢰",
    question: "이 사회 설계는 능력의 보상과 공동체 책임을 함께 설명하나요?"
  },
  {
    key: "elderly_citizen",
    classKey: "lower",
    label: "노후 소득이 부족한 노인",
    weight: 14,
    headline: "일할 수 있는 시간은 줄었고 의료비 걱정은 커졌습니다.",
    situation:
      "복지 예산이 낮으면 생계와 의료 접근성이 흔들리지만, 지속 가능한 재원이 함께 필요합니다.",
    priority: "의료와 생계 보장, 세대 간 공정성, 복지 지속 가능성",
    question: "이 사회 설계는 스스로를 지키기 어려운 시민을 보호하나요?"
  },
  {
    key: "new_worker",
    classKey: "lower",
    label: "첫 직장을 구하는 청년 노동자",
    weight: 12,
    headline: "안정적인 일자리를 찾고 있지만 임금과 고용 기회가 모두 중요합니다.",
    situation:
      "최저임금은 생활의 버팀목이지만, 고용이 줄어들면 첫 출발 자체가 어려워질 수 있습니다.",
    priority: "최저 생활 보장, 일자리 기회, 미래 이동 가능성",
    question: "이 사회 설계는 지금의 약자를 보호하면서 미래 기회도 열어두나요?"
  }
];

const LOCAL_STORAGE_KEY = "constitution-game:sessions";
const LOCAL_SYNC_EVENT = "constitution-game:local-sync";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const stddev = values => {
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const buildEventCards = ({ constitution, survivalIndex, assetGrowth, socialIntegration }) => {
  const taxPolicy = getTaxPolicy(constitution);
  const taxRate = Number(taxPolicy.taxRate);
  const budgetDirection = getBudgetDirection(constitution);
  const welfareBudget = Number(budgetDirection.welfareBudget);
  const wagePolicy = getWagePolicy(constitution);
  const minimumWage = Number(wagePolicy.minimumWage);
  const cards = [];

  if (budgetDirection.key === "growth") {
    cards.push({
      type: "warning",
      title: "일자리는 늘었지만 안전망 논쟁이 커졌습니다",
      body:
        "투자와 고용은 활발해졌지만, 생계와 의료 지원이 부족하다는 시민들의 불안도 함께 커졌습니다.",
      question: "성장의 자유를 지키면서 가장 불리한 시민의 최소 안전은 어디까지 보장해야 할까요?"
    });
  }

  if (budgetDirection.key === "basic") {
    cards.push({
      type: "good",
      title: "최소 생활 보장이 두꺼워졌습니다",
      body:
        "생계, 의료, 주거 지원이 확대되어 위기에 놓인 시민들이 무너질 가능성이 줄었습니다.",
      question: "누가 세금을 더 내고, 그 부담을 왜 받아들일 수 있나요?"
    });
  }

  if (budgetDirection.key === "opportunity") {
    cards.push({
      type: "mixed",
      title: "교육과 직업훈련 예산이 늘었습니다",
      body:
        "당장의 현금 지원은 제한적이지만, 청년과 저소득층이 다시 올라설 수 있는 기회 투자가 확대되었습니다.",
      question: "기회 투자는 지금 가장 어려운 시민에게도 충분히 빠른 도움이 될까요?"
    });
  }

  if (taxRate >= 55) {
    cards.push({
      type: "warning",
      title: "고소득층의 조세 저항이 커졌습니다",
      body:
        "높은 세율로 공동체 재원은 늘었지만, 일부 시민은 경제 활동의 보상이 줄었다고 반발합니다.",
      question: "세금을 더 내는 시민에게 이 규칙을 어떻게 설명할 수 있나요?"
    });
  }

  if (taxRate <= 18) {
    cards.push({
      type: "warning",
      title: "공공 서비스 예산이 부족해졌습니다",
      body:
        "세금 부담은 낮아졌지만 교육, 의료, 안전망을 유지할 재원이 충분하지 않다는 지적이 나옵니다.",
      question: "세금은 낮아졌지만, 누가 불편을 겪고 있나요?"
    });
  }

  if (minimumWage >= 13500) {
    cards.push({
      type: "mixed",
      title: "노동자의 생활 안정이 높아졌지만 고용 부담도 커졌습니다",
      body:
        "저임금 노동자의 삶은 안정되었지만, 일부 작은 사업장은 추가 고용을 망설이고 있습니다.",
      question: "최저임금 인상의 속도와 보완책을 어떻게 설계해야 할까요?"
    });
  }

  if (minimumWage <= 9500) {
    cards.push({
      type: "warning",
      title: "저임금 노동자의 생활 불안이 커졌습니다",
      body:
        "일자리는 유지되었지만 임금만으로 기본 생활을 꾸리기 어렵다는 시민들의 목소리가 커졌습니다.",
      question: "일자리 기회와 최저 생활 보장은 어떻게 함께 지킬 수 있을까요?"
    });
  }

  if (socialIntegration < 55) {
    cards.push({
      type: "warning",
      title: "시민 사이의 갈등이 커졌습니다",
      body:
        "계층 사이의 결과 차이가 커져 서로가 같은 규칙을 공정하다고 느끼지 못하고 있습니다.",
      question: "누구에게 혜택이 가고, 누구에게 부담이 커졌나요?"
    });
  }

  if (survivalIndex >= 78 && socialIntegration >= 68 && assetGrowth >= -15) {
    cards.push({
      type: "good",
      title: "대체로 안정적인 사회 합의가 만들어졌습니다",
      body:
        "가장 불리한 시민의 생존 가능성을 지키면서도 사회 전체의 갈등이 크게 악화되지 않았습니다.",
      question: "이 사회 설계를 무지의 베일 뒤에서도 선택할 수 있다고 말할 근거는 무엇인가요?"
    });
  }

  const supplementalCards = [
    {
      type: "mixed",
      title: "세금 부담은 비교적 안정적으로 나뉘었습니다",
      body:
        "세금이 너무 낮거나 높지는 않지만, 각 시민이 느끼는 부담과 혜택은 다를 수 있습니다.",
      question: "현재 세금 부담을 각 역할에게 어떻게 설명할 수 있나요?"
    },
    {
      type: "mixed",
      title: "최저임금 변화는 완만하게 적용됩니다",
      body:
        "일자리와 생활 안정 사이에서 급격한 충돌은 줄었지만, 저임금 노동자에게 충분한지 따져볼 필요가 있습니다.",
      question: "이 최저임금 방향은 노동자와 고용자 모두에게 납득 가능한가요?"
    },
    {
      type: "mixed",
      title: "서로 다른 시민의 평가가 갈릴 수 있습니다",
      body:
        "같은 제도라도 역할에 따라 안정, 부담, 기회가 다르게 느껴질 수 있습니다.",
      question: "가장 설득하기 어려운 시민은 누구이고, 그 이유는 무엇인가요?"
    },
    {
      type: "mixed",
      title: "큰 위기는 없지만 설득력 있는 이유가 필요합니다",
      body:
        "정책 수치가 극단적이지 않아 사회는 급격히 흔들리지 않았습니다. 이제 왜 이 균형이 공정한지 설명해야 합니다.",
      question: "우리 모둠의 사회 원칙을 한 문장으로 말하면 무엇인가요?"
    }
  ];

  supplementalCards.forEach((supplementalCard) => {
    if (cards.length < 3 && !cards.some((card) => card.title === supplementalCard.title)) {
      cards.push(supplementalCard);
    }
  });

  while (cards.length < 3) {
    cards.push({
      ...supplementalCards[cards.length % supplementalCards.length],
      title: `추가 점검 ${cards.length + 1}`
    });
  }

  return cards.slice(0, 3);
};

const readLocalSessions = () => {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeLocalSessions = sessions => {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event(LOCAL_SYNC_EVENT));
};

const getLocalSession = pin => readLocalSessions()[pin] ?? null;

const updateLocalSession = (pin, updater) => {
  const sessions = readLocalSessions();
  const current = sessions[pin] ?? null;
  const next = updater(current);

  if (!next) return null;

  sessions[pin] = next;
  writeLocalSessions(sessions);
  return next;
};

const buildGroups = groupCount => {
  const groups = {};
  for (let i = 1; i <= groupCount; i += 1) {
    groups[`group_${i}`] = {
      id: `group_${i}`,
      name: `${i}모둠`,
      connected: false,
      joinedAt: null,
      lastSeen: null,
      isSubmitted: false,
      submittedAt: null,
      constitution: DEFAULT_CONSTITUTION,
      assignedClass: null,
      rouletteDone: false,
      result: null,
      history: []
    };
  }
  return groups;
};

const pruneConnectedGroups = session => {
  const groups = Object.fromEntries(
    Object.entries(session.groups ?? {}).filter(([, group]) => group.connected)
  );
  const firstGroupId = Object.keys(groups)[0] ?? null;

  return {
    ...session,
    groupLocked: true,
    selectedGroupId: groups[session.selectedGroupId]
      ? session.selectedGroupId
      : firstGroupId,
    groups
  };
};

const prepareRevisionRound = session => {
  if ((session.currentRound ?? 1) >= 2) {
    return { ...session, phase: "revision", phaseStartedAt: Date.now() };
  }

  const groups = Object.fromEntries(
    Object.entries(session.groups ?? {}).map(([id, group]) => {
      const history = [...(group.history ?? [])];

      if (group.result) {
        history.push({
          round: session.currentRound ?? 1,
          constitution: group.constitution,
          assignedClass: group.assignedClass,
          result: group.result,
          submittedAt: group.submittedAt
        });
      }

      return [
        id,
        {
          ...group,
          history,
          isSubmitted: false,
          submittedAt: null,
          rouletteDone: false,
          result: null
        }
      ];
    })
  );

  return {
    ...session,
    currentRound: 2,
    phase: "revision",
    phaseStartedAt: Date.now(),
    groups
  };
};

export const generatePin = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export const pickSocialClass = () => {
  const pool = FUTURE_SELF_CARDS.length > 0 ? FUTURE_SELF_CARDS : CLASS_POOL;
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  const roll = Math.random() * totalWeight;
  let acc = 0;

  for (const item of pool) {
    acc += item.weight;
    if (roll <= acc) return item;
  }

  return pool[pool.length - 1];
};

export const calculateResult = (constitution, assignedClassKey) => {
  const taxPolicy = getTaxPolicy(constitution);
  const taxRate = Number(taxPolicy.taxRate);
  const budgetDirection = getBudgetDirection(constitution);
  const welfareBudget = Number(budgetDirection.welfareBudget);
  const wagePolicy = getWagePolicy(constitution);
  const minimumWage = Number(wagePolicy.minimumWage);
  const directionEffects = {
    growth: {
      survivalBonus: -2,
      assetBonus: 5,
      middleBonus: 0,
      lowerBonus: -2,
      integrationBonus: -4
    },
    basic: {
      survivalBonus: 10,
      assetBonus: -3,
      middleBonus: 3,
      lowerBonus: 8,
      integrationBonus: 6
    },
    opportunity: {
      survivalBonus: 4,
      assetBonus: 2,
      middleBonus: 7,
      lowerBonus: 6,
      integrationBonus: 8
    }
  }[budgetDirection.key];

  const baseSurvival =
    welfareBudget * 1.5 + minimumWage / 500 - taxRate * 0.2;
  const stabilityBonus =
    welfareBudget >= 25 && minimumWage >= 11000 ? 25 : 0;
  const survivalIndex = clamp(
    Math.round(baseSurvival + stabilityBonus + directionEffects.survivalBonus),
    0,
    100
  );

  const assetGrowth =
    taxRate <= 50
      ? 5.0 - taxRate * 0.5
      : 5.0 - 50 * 0.5 - (taxRate - 50) * 0.8;
  const adjustedAssetGrowth = assetGrowth + directionEffects.assetBonus;

  const upperAsset = 100 + adjustedAssetGrowth * 2;
  const middleAsset =
    70 +
    (minimumWage - 8000) / 400 -
    taxRate * 0.08 +
    welfareBudget * 0.25 +
    directionEffects.middleBonus;
  const lowerAsset =
    35 +
    survivalIndex * 0.7 +
    welfareBudget * 0.4 +
    minimumWage / 1500 +
    directionEffects.lowerBonus;

  const gapStddev = stddev([upperAsset, middleAsset, lowerAsset]);
  const socialIntegration = clamp(
    Math.round(
      100 -
        gapStddev +
        Math.min(welfareBudget, 35) * 0.3 +
        directionEffects.integrationBonus
    ),
    0,
    100
  );

  const classOutcomes = {
    upper: {
      label: "상류층",
      score: clamp(
        Math.round(55 + adjustedAssetGrowth + socialIntegration * 0.25),
        0,
        100
      ),
      message:
        adjustedAssetGrowth >= -10
          ? "내 역할에서는 자산과 경제활동 여지가 비교적 유지됩니다. 다만 이 규칙을 저소득층이나 노동자 역할에서도 받아들일 수 있을지 함께 따져보세요."
          : "세금 부담이 커져 자산을 늘리기 어렵다고 느낄 수 있습니다. 그 부담이 더 안정적인 사회를 만드는 데 필요한지 근거를 찾아보세요."
    },
    middle: {
      label: "중산층",
      score: clamp(
        Math.round(50 + socialIntegration * 0.35 + adjustedAssetGrowth * 0.2),
        0,
        100
      ),
      message:
        socialIntegration >= 70
          ? "내 역할에서는 비교적 안정적으로 살아갈 수 있는 조건이 보입니다. 다만 이 안정이 세금 부담, 복지 혜택, 일자리 조건 속에서도 계속 유지될 수 있는지 근거를 찾아보세요."
          : "내 역할에서는 생활 불안이 커질 수 있습니다. 세금, 예산, 최저임금 중 무엇을 조정하면 안정이 나아질지 논의해 보세요."
    },
    lower: {
      label: "빈곤층",
      score: survivalIndex,
      message:
        survivalIndex >= 80
          ? "내 역할에서는 기본 생활을 지킬 가능성이 높습니다. 이 보호가 어떤 정책 선택 덕분인지 근거를 찾아보세요."
          : "내 역할에서는 생계, 의료, 주거를 지키기 어려울 수 있습니다. 무지의 베일 뒤에서도 이 규칙을 선택할 수 있을지 다시 물어보세요."
    }
  };

  return {
    survivalIndex,
    assetGrowth: Number(adjustedAssetGrowth.toFixed(1)),
    socialIntegration,
    assets: {
      upper: Math.round(upperAsset),
      middle: Math.round(middleAsset),
      lower: Math.round(lowerAsset)
    },
    assignedClass: assignedClassKey,
    classResult: classOutcomes[assignedClassKey],
    eventCards: buildEventCards({
      constitution,
      survivalIndex,
      assetGrowth: Number(adjustedAssetGrowth.toFixed(1)),
      socialIntegration
    })
  };
};

export function useGameData(pin, groupId = null) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(pin));
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());

  const isDemoMode = !isFirebaseConfigured;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pin) {
      setSession(null);
      setLoading(false);
      return undefined;
    }

    if (!database) {
      const syncLocalSession = () => {
        setSession(getLocalSession(pin));
        setLoading(false);
      };

      syncLocalSession();
      window.addEventListener(LOCAL_SYNC_EVENT, syncLocalSession);
      window.addEventListener("storage", syncLocalSession);

      return () => {
        window.removeEventListener(LOCAL_SYNC_EVENT, syncLocalSession);
        window.removeEventListener("storage", syncLocalSession);
      };
    }

    setLoading(true);
    const sessionRef = ref(database, `sessions/${pin}`);

    const unsubscribe = onValue(
      sessionRef,
      snapshot => {
        setSession(snapshot.val());
        setLoading(false);
      },
      err => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [pin]);

  const group = useMemo(() => {
    if (!session || !groupId) return null;
    return session.groups?.[groupId] ?? null;
  }, [session, groupId]);

  const knownPhase = SESSION_PHASES.some(item => item.key === session?.phase)
    ? session.phase
    : "discussion";
  const phase = knownPhase;
  const inputOpen = INPUT_OPEN_PHASES.includes(phase);

  const remainingSeconds = useMemo(() => {
    if (!session) return 0;
    if (session.status !== "running") return session.durationSeconds ?? 300;
    if (!session.endsAt) return session.durationSeconds ?? 300;
    return Math.max(0, Math.floor((session.endsAt - now) / 1000));
  }, [session, now]);

  const createSession = async ({ groupCount = 8, durationSeconds = 300 } = {}) => {
    const createdAt = Date.now();
    const safeGroupCount = clamp(Number(groupCount) || 8, 4, 8);

    const sessionPayload = {
      status: "waiting",
      phase: "discussion",
      phaseStartedAt: createdAt,
      currentRound: 1,
      groupLocked: false,
      createdAt,
      durationSeconds,
      startedAt: null,
      endsAt: null,
      selectedGroupId: null,
      groups: buildGroups(safeGroupCount)
    };

    if (!database) {
      const sessions = readLocalSessions();
      let newPin = generatePin();

      while (sessions[newPin]) {
        newPin = generatePin();
      }

      sessions[newPin] = { ...sessionPayload, pin: newPin };
      writeLocalSessions(sessions);
      return { pin: newPin };
    }

    const newPin = generatePin();
    await set(ref(database, `sessions/${newPin}`), {
      ...sessionPayload,
      pin: newPin
    });

    return { pin: newPin };
  };

  const startSession = async () => {
    if (!pin) return { ok: false };

    const startedAt = Date.now();

    if (!database) {
      let ok = false;
      updateLocalSession(pin, current => {
        if (!current || current.status === "running") return current;

        const durationSeconds = current.durationSeconds ?? 300;
        ok = true;

        return {
          ...current,
          status: "running",
          startedAt,
          endsAt: startedAt + durationSeconds * 1000
        };
      });
      return { ok };
    }

    const snapshot = await get(ref(database, `sessions/${pin}`));
    const current = snapshot.val();
    if (!current || current.status === "running") return { ok: false };

    const durationSeconds = current.durationSeconds ?? 300;

    await update(ref(database, `sessions/${pin}`), {
      status: "running",
      startedAt,
      endsAt: startedAt + durationSeconds * 1000
    });

    return { ok: true };
  };

  const setPhase = async nextPhase => {
    if (!pin || !SESSION_PHASES.some(item => item.key === nextPhase)) return;

    if (!database) {
      updateLocalSession(pin, current => {
        if (!current) return current;
        if (nextPhase === "revision") return prepareRevisionRound(current);
        return {
          ...current,
          phase: nextPhase,
          phaseStartedAt: Date.now()
        };
      });
      return;
    }

    if (nextPhase === "revision") {
      const snapshot = await get(ref(database, `sessions/${pin}`));
      const current = snapshot.val();
      if (!current) return;
      await set(ref(database, `sessions/${pin}`), prepareRevisionRound(current));
      return;
    }

    await update(ref(database, `sessions/${pin}`), {
      phase: nextPhase,
      phaseStartedAt: Date.now()
    });
  };

  const finalizeGroups = async () => {
    if (!pin) return { ok: false, count: 0 };

    if (!database) {
      let count = 0;
      updateLocalSession(pin, current => {
        if (!current) return current;
        const next = pruneConnectedGroups(current);
        count = Object.keys(next.groups ?? {}).length;
        return count > 0 ? next : current;
      });
      return { ok: count > 0, count };
    }

    const snapshot = await get(ref(database, `sessions/${pin}`));
    const current = snapshot.val();
    if (!current) return { ok: false, count: 0 };

    const next = pruneConnectedGroups(current);
    const count = Object.keys(next.groups ?? {}).length;
    if (count === 0) return { ok: false, count: 0 };

    await set(ref(database, `sessions/${pin}`), next);
    return { ok: true, count };
  };

  const connectGroup = async () => {
    if (!pin || !groupId) return;

    if (!database) {
      updateLocalSession(pin, current => {
        if (!current?.groups?.[groupId]) return current;
        if (current.groupLocked && !current.groups[groupId].connected) return current;

        return {
          ...current,
          groups: {
            ...current.groups,
            [groupId]: {
              ...current.groups[groupId],
              connected: true,
              joinedAt: current.groups[groupId].joinedAt ?? Date.now(),
              lastSeen: Date.now()
            }
          }
        };
      });
      return;
    }

    const sessionSnapshot = await get(ref(database, `sessions/${pin}`));
    const currentSession = sessionSnapshot.val();
    if (!currentSession?.groups?.[groupId]) return;
    if (currentSession.groupLocked && !currentSession.groups[groupId].connected) {
      return;
    }

    await update(ref(database, `sessions/${pin}/groups/${groupId}`), {
      connected: true,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    });
  };

  const updateConstitution = async constitution => {
    if (!pin || !groupId || group?.isSubmitted || !inputOpen) return;

    const nextConstitution = {
      taxPolicy: getTaxPolicy(constitution).key,
      taxRate: getTaxPolicy(constitution).taxRate,
      budgetDirection: getBudgetDirection(constitution).key,
      welfareBudget: getBudgetDirection(constitution).welfareBudget,
      wagePolicy: getWagePolicy(constitution).key,
      minimumWage: getWagePolicy(constitution).minimumWage
    };

    if (!database) {
      updateLocalSession(pin, current => {
        if (!current?.groups?.[groupId]) return current;
        if (!INPUT_OPEN_PHASES.includes(current.phase ?? "discussion")) {
          return current;
        }

        return {
          ...current,
          groups: {
            ...current.groups,
            [groupId]: {
              ...current.groups[groupId],
              constitution: nextConstitution,
              lastSeen: Date.now()
            }
          }
        };
      });
      return;
    }

    await update(
      ref(database, `sessions/${pin}/groups/${groupId}/constitution`),
      nextConstitution
    );

    await update(ref(database, `sessions/${pin}/groups/${groupId}`), {
      lastSeen: serverTimestamp()
    });
  };

  const submitConstitution = async constitution => {
    if (!pin || !groupId || !inputOpen) return false;

    const nextConstitution = {
      taxPolicy: getTaxPolicy(constitution).key,
      taxRate: getTaxPolicy(constitution).taxRate,
      budgetDirection: getBudgetDirection(constitution).key,
      welfareBudget: getBudgetDirection(constitution).welfareBudget,
      wagePolicy: getWagePolicy(constitution).key,
      minimumWage: getWagePolicy(constitution).minimumWage
    };

    if (!database) {
      let committed = false;

      updateLocalSession(pin, current => {
        if (!current?.groups?.[groupId] || current.groups[groupId].isSubmitted) {
          return current;
        }
        if (!INPUT_OPEN_PHASES.includes(current.phase ?? "discussion")) {
          return current;
        }

        committed = true;

        return {
          ...current,
          groups: {
            ...current.groups,
            [groupId]: {
              ...current.groups[groupId],
              constitution: nextConstitution,
              isSubmitted: true,
              submittedAt: Date.now(),
              lastSeen: Date.now()
            }
          }
        };
      });

      return committed;
    }

    const groupRef = ref(database, `sessions/${pin}/groups/${groupId}`);

    const tx = await runTransaction(groupRef, current => {
      if (!current || current.isSubmitted) return current;

      return {
        ...current,
        constitution: nextConstitution,
        isSubmitted: true,
        submittedAt: Date.now(),
        lastSeen: Date.now()
      };
    });

    return tx.committed;
  };

  const selectGroup = async selectedGroupId => {
    if (!pin) return;

    if (!database) {
      updateLocalSession(pin, current => {
        if (!current) return current;
        return {
          ...current,
          selectedGroupId
        };
      });
      return;
    }

    await update(ref(database, `sessions/${pin}`), {
      selectedGroupId
    });
  };

  const runRoulette = async selectedGroupId => {
    if (!pin || !selectedGroupId) return null;

    const nextPhase =
      phase === "revision" || phase === "final" ? "final" : "result";

    if (!database) {
      let outcome = null;

      updateLocalSession(pin, current => {
        const selectedGroup = current?.groups?.[selectedGroupId];
        if (!selectedGroup?.constitution) return current;

        const picked = selectedGroup.assignedClass ?? pickSocialClass();
        const result = calculateResult(
          selectedGroup.constitution,
          picked.classKey ?? picked.key
        );
        outcome = { picked, result };

        return {
          ...current,
          phase: nextPhase,
          selectedGroupId,
          groups: {
            ...current.groups,
            [selectedGroupId]: {
              ...selectedGroup,
              assignedClass: picked,
              rouletteDone: true,
              result
            }
          }
        };
      });

      return outcome;
    }

    const groupRef = ref(database, `sessions/${pin}/groups/${selectedGroupId}`);
    const snapshot = await get(groupRef);
    const selectedGroup = snapshot.val();

    if (!selectedGroup?.constitution) return null;

    const picked = selectedGroup.assignedClass ?? pickSocialClass();
    const result = calculateResult(
      selectedGroup.constitution,
      picked.classKey ?? picked.key
    );

    await update(groupRef, {
      assignedClass: picked,
      rouletteDone: true,
      result
    });

    await update(ref(database, `sessions/${pin}`), {
      phase: nextPhase,
      selectedGroupId
    });

    return { picked, result };
  };

  return {
    session,
    group,
    groups: session?.groups ?? {},
    loading,
    error,
    isFirebaseConfigured,
    isDemoMode,
    phase,
    inputOpen,
    remainingSeconds,
    createSession,
    startSession,
    setPhase,
    finalizeGroups,
    connectGroup,
    updateConstitution,
    submitConstitution,
    selectGroup,
    runRoulette
  };
}
