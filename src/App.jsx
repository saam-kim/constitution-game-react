import { useState } from "react";
import FirebaseSetupPanel from "./FirebaseSetupPanel";
import StudentApp from "./StudentApp";
import TeacherDashboard from "./TeacherDashboard";
import { getAppPath, getRouteParams } from "./routes";

export const TEACHER_PIN = "1234";

function StartScreen() {
  const [role, setRole] = useState("teacher");
  const [pin, setPin] = useState("");
  const [groupId, setGroupId] = useState("group_1");
  const [message, setMessage] = useState("");

  const enter = () => {
    if (role === "teacher" && pin !== TEACHER_PIN) {
      setMessage("교사용 PIN이 올바르지 않습니다.");
      return;
    }

    if (role === "teacher") {
      window.location.href = getAppPath({
        role,
        teacherPin: TEACHER_PIN
      });
    } else {
      window.location.href = getAppPath({
        role,
        pin,
        groupId
      });
    }
  };

  return (
    <main className="app-page center-page">
      <section className="brand-card">
        <div className="mb-8 flex items-center gap-5">
          <div className="brand-logo">붕</div>
          <div>
            <p className="brand-kicker">BOOONG CLASSROOM</p>
            <h1 className="brand-title">헌법 제정 게임</h1>
          </div>
        </div>

        <div className="segmented">
          <button
            type="button"
            onClick={() => {
              setRole("teacher");
              setPin("");
              setMessage("");
            }}
            className={`h-14 button-secondary ${role === "teacher" ? "active" : ""}`}
          >
            교사
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("student");
              setPin("");
              setMessage("");
            }}
            className={`h-14 button-secondary ${role === "student" ? "active" : ""}`}
          >
            학생
          </button>
        </div>

        <label className="field-label mt-6">
          {role === "teacher" ? "교사용 PIN" : "참가 PIN"}
          <input
            value={pin}
            onChange={event => {
              setMessage("");
              setPin(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, role === "teacher" ? 4 : 6)
              );
            }}
            placeholder={role === "teacher" ? "교사용 PIN 4자리" : "6자리 세션 PIN"}
            className="field-control"
          />
        </label>

        {role === "student" && (
          <label className="field-label mt-6">
            모둠
            <select
              value={groupId}
              onChange={event => setGroupId(event.target.value)}
              className="field-control"
            >
              {Array.from({ length: 8 }, (_, index) => {
                const id = `group_${index + 1}`;
                return (
                  <option key={id} value={id}>
                    {index + 1}모둠
                  </option>
                );
              })}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={enter}
          className="button-primary mt-8 h-16 w-full text-2xl"
        >
          입장
        </button>

        {message && <p className="danger-callout mt-4 text-base">{message}</p>}

        <FirebaseSetupPanel />
      </section>
    </main>
  );
}

export default function App() {
  const params = getRouteParams();
  const role = params.get("role");
  const pin = params.get("pin") || "";
  const groupId = params.get("groupId") || "group_1";
  const teacherPin = params.get("teacherPin") || "";

  if (role === "teacher") {
    return <TeacherDashboard pin={pin} teacherPin={teacherPin} />;
  }

  if (role === "student") {
    return <StudentApp pin={pin} groupId={groupId} />;
  }

  return <StartScreen />;
}
