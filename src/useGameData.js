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
  { key: "constitution", label: "헌법 제정", note: "정책 선택과 제출" },
  { key: "result", label: "결과 확인", note: "1차 룰렛과 결과 검토" },
  { key: "revision", label: "새 헌법 토론", note: "결과를 바탕으로 재토론" },
  { key: "final", label: "결과 확인 및 발표", note: "최종 룰렛과 발표" }
];

export const INPUT_OPEN_PHASES = ["constitution", "revision"];

const DEFAULT_CONSTITUTION = {
  taxRate: 35,
  welfareBudget: 25,
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
    question: "이 헌법은 가장 불리한 위치의 학생도 존중하고 있나요?"
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
    question: "이 헌법은 일하는 사람과 고용하는 사람의 부담을 함께 보나요?"
  },
  {
    key: "office_worker_parent",
    classKey: "middle",
    label: "아이를 키우는 중산층 직장인",
    weight: 22,
    headline: "월급으로 생활하며 교육비와 주거비를 함께 감당합니다.",
    situation:
      "복지가 늘면 돌봄 부담은 줄지만, 세금이 높아지면 매달 쓸 수 있는 돈이 줄어듭니다.",
    priority: "생활 안정, 세금과 복지의 균형, 사회 갈등 완화",
    question: "이 헌법은 부담과 혜택을 납득 가능한 방식으로 나누나요?"
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
    question: "이 헌법은 능력의 보상과 공동체 책임을 함께 설명하나요?"
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
    question: "이 헌법은 스스로를 지키기 어려운 시민을 보호하나요?"
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
    question: "이 헌법은 지금의 약자를 보호하면서 미래 기회도 열어두나요?"
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
  const taxRate = Number(constitution.taxRate);
  const welfareBudget = Number(constitution.welfareBudget);
  const minimumWage = Number(constitution.minimumWage);
  const cards = [];

  if (welfareBudget < 18) {
    cards.push({
      type: "warning",
      title: "공공병원 대기 시간이 늘었습니다",
      body:
        "복지 예산이 낮아 의료와 생계 지원이 충분히 작동하지 못했습니다. 가장 취약한 시민들이 먼저 불안을 느끼고 있습니다.",
      question: "복지 예산을 어디까지 보장해야 가장 불리한 시민도 받아들일 수 있을까요?"
    });
  }

  if (welfareBudget >= 35) {
    cards.push({
      type: "good",
      title: "사회 안전망이 두꺼워졌습니다",
      body:
        "생계, 의료, 주거 지원이 확대되어 위기에 놓인 시민들이 다시 일어설 여지가 커졌습니다.",
      question: "이 복지 수준을 유지하기 위한 세금 부담은 정당하게 나누어지고 있나요?"
    });
  }

  if (taxRate >= 55) {
    cards.push({
      type: "warning",
      title: "고소득층의 조세 저항이 커졌습니다",
      body:
        "높은 세율로 공동체 재원은 늘었지만, 일부 시민은 경제 활동의 보상이 줄었다고 반발합니다.",
      question: "공동체 책임과 개인의 성취 보상은 어디에서 균형을 이룰까요?"
    });
  }

  if (taxRate <= 18) {
    cards.push({
      type: "warning",
      title: "공공 서비스 예산이 부족해졌습니다",
      body:
        "세금 부담은 낮아졌지만 교육, 의료, 안전망을 유지할 재원이 충분하지 않다는 지적이 나옵니다.",
      question: "낮은 세금이 모두에게 공정한 결과를 만들고 있나요?"
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
      title: "시민 갈등 지수가 높아졌습니다",
      body:
        "계층 사이의 결과 차이가 커져 서로가 같은 규칙을 공정하다고 느끼지 못하고 있습니다.",
      question: "규칙의 혜택과 부담을 다시 나누어야 할 부분은 어디인가요?"
    });
  }

  if (survivalIndex >= 78 && socialIntegration >= 68 && assetGrowth >= -15) {
    cards.push({
      type: "good",
      title: "대체로 안정적인 사회 합의가 만들어졌습니다",
      body:
        "가장 불리한 시민의 생존 가능성을 지키면서도 사회 전체의 갈등이 크게 악화되지 않았습니다.",
      question: "이 헌법을 무지의 베일 뒤에서도 선택할 수 있다고 말할 근거는 무엇인가요?"
    });
  }

  if (cards.length === 0) {
    cards.push({
      type: "mixed",
      title: "큰 위기는 없지만 설득력 있는 이유가 필요합니다",
      body:
        "정책 수치가 극단적이지 않아 사회는 급격히 흔들리지 않았습니다. 이제 왜 이 균형이 공정한지 설명해야 합니다.",
      question: "우리 모둠의 헌법 원칙을 한 문장으로 말하면 무엇인가요?"
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
  const taxRate = Number(constitution.taxRate);
  const welfareBudget = Number(constitution.welfareBudget);
  const minimumWage = Number(constitution.minimumWage);

  const baseSurvival =
    welfareBudget * 1.5 + minimumWage / 500 - taxRate * 0.2;
  const stabilityBonus =
    welfareBudget >= 25 && minimumWage >= 11000 ? 25 : 0;
  const survivalIndex = clamp(
    Math.round(baseSurvival + stabilityBonus),
    0,
    100
  );

  const assetGrowth =
    taxRate <= 50
      ? 5.0 - taxRate * 0.5
      : 5.0 - 50 * 0.5 - (taxRate - 50) * 0.8;

  const upperAsset = 100 + assetGrowth * 2;
  const middleAsset =
    70 + (minimumWage - 8000) / 400 - taxRate * 0.08 + welfareBudget * 0.25;
  const lowerAsset =
    35 + survivalIndex * 0.7 + welfareBudget * 0.4 + minimumWage / 1500;

  const gapStddev = stddev([upperAsset, middleAsset, lowerAsset]);
  const socialIntegration = clamp(
    Math.round(100 - gapStddev + Math.min(welfareBudget, 35) * 0.3),
    0,
    100
  );

  const classOutcomes = {
    upper: {
      label: "상류층",
      score: clamp(
        Math.round(55 + assetGrowth + socialIntegration * 0.25),
        0,
        100
      ),
      message:
        assetGrowth >= -10
          ? "자산을 지키는 데는 성공했지만, 이 규칙이 다른 위치에서도 공정한지 토론해 볼 필요가 있습니다."
          : "높은 조세 부담으로 자산 성장 압력이 커졌습니다. 공동체의 안정과 개인의 동기를 함께 따져 보세요."
    },
    middle: {
      label: "중산층",
      score: clamp(
        Math.round(50 + socialIntegration * 0.35 + assetGrowth * 0.2),
        0,
        100
      ),
      message:
        socialIntegration >= 70
          ? "격차가 완화되어 중산층의 안정성이 높습니다. 이 안정이 지속 가능한지 근거를 찾아 보세요."
          : "격차가 커지면 중산층의 불안정성이 증가합니다. 어떤 조항을 조정할지 논의해 보세요."
    },
    lower: {
      label: "빈곤층",
      score: survivalIndex,
      message:
        survivalIndex >= 80
          ? "기본 생활을 지킬 가능성이 높습니다. 이 헌법이 가장 불리한 위치를 충분히 고려했는지 평가해 보세요."
          : "생존 지수가 낮아 생활 안정 장치가 부족합니다. 무지의 베일 뒤에서 이 규칙을 선택할 수 있을지 물어보세요."
    }
  };

  return {
    survivalIndex,
    assetGrowth: Number(assetGrowth.toFixed(1)),
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
      assetGrowth: Number(assetGrowth.toFixed(1)),
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
      taxRate: clamp(Number(constitution.taxRate), 0, 70),
      welfareBudget: clamp(Number(constitution.welfareBudget), 0, 50),
      minimumWage: clamp(Number(constitution.minimumWage), 8000, 15000)
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
      taxRate: clamp(Number(constitution.taxRate), 0, 70),
      welfareBudget: clamp(Number(constitution.welfareBudget), 0, 50),
      minimumWage: clamp(Number(constitution.minimumWage), 8000, 15000)
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
