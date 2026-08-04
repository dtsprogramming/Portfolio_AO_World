import type { CSSProperties, Dispatch, SetStateAction } from "react";
import type { ForgeLanguage, ForgeMode } from "./types";
import {
  archivePractice,
  forgeProgram,
  landmarks,
} from "./worldData";

type ActiveMachine = (typeof landmarks)[number] | undefined;

/**
 * Interactive console for every machine challenge: Unity knowledge checks,
 * loop tracing, binary conversion, and the final Power Nexus reward state.
 */
export function MachinePanel({
  active, archiveTab, setArchiveTab, archivePrompt, setArchivePrompt,
  archiveOrder, setArchiveOrder, archiveAnswer, setArchiveAnswer,
  completedMachines, challengeNotice, setChallengeNotice,
  loopLanguage, setLoopLanguage, loopMode, loopLimit, loopStep,
  loopExpression, loopAnswer, loopChoices, loopResult, setLoopResult,
  relayTarget, setRelayTarget, relayValue, relayNodes, setRelayNodes,
  relayBitValues, practiceScore, collectedCount, shuffle, addPracticeScore,
  completeMachine, generateForgePractice, onClose,
}: {
  active: ActiveMachine;
  archiveTab: number;
  setArchiveTab: Dispatch<SetStateAction<number>>;
  archivePrompt: number;
  setArchivePrompt: Dispatch<SetStateAction<number>>;
  archiveOrder: number[];
  setArchiveOrder: Dispatch<SetStateAction<number[]>>;
  archiveAnswer: number | null;
  setArchiveAnswer: Dispatch<SetStateAction<number | null>>;
  completedMachines: string[];
  challengeNotice: string | null;
  setChallengeNotice: Dispatch<SetStateAction<string | null>>;
  loopLanguage: ForgeLanguage;
  setLoopLanguage: Dispatch<SetStateAction<ForgeLanguage>>;
  loopMode: ForgeMode;
  loopLimit: number;
  loopStep: number;
  loopExpression: string;
  loopAnswer: number;
  loopChoices: number[];
  loopResult: string | null;
  setLoopResult: Dispatch<SetStateAction<string | null>>;
  relayTarget: number;
  setRelayTarget: Dispatch<SetStateAction<number>>;
  relayValue: number;
  relayNodes: boolean[];
  setRelayNodes: Dispatch<SetStateAction<boolean[]>>;
  relayBitValues: number[];
  practiceScore: number;
  collectedCount: number;
  shuffle: (items: number[]) => number[];
  addPracticeScore: () => void;
  completeMachine: (id: string) => void;
  generateForgePractice: () => void;
  onClose: () => void;
}) {
  return <>
{active && (
      <section
        className={`machine-panel interactive-panel machine-${active.id}`}
        style={{ "--machine": active.color } as CSSProperties}
      >
        <button
          className="close"
          onClick={() => {
            onClose();
            setChallengeNotice(null);
          }}
        >
          ×
        </button>
        <span>MACHINE // {active.id.toUpperCase()}</span>
        <h2>{active.name}</h2>
        <p>{active.role}</p>
        {active.id === "archive" && (
          <div className="machine-activity">
            <div className="activity-tabs">
              {["PROFILE", "METHOD", "NOW"].map((label, i) => (
                <button
                  key={label}
                  className={archiveTab === i ? "active" : ""}
                  onClick={() => setArchiveTab(i)}
                >
                  {label}
                </button>
              ))}
            </div>
            <article className="gallery-card">
              <small>
                {
                  [
                    "ABOUT THE BUILDER",
                    "DESIGN PHILOSOPHY",
                    "CURRENT SIGNAL",
                  ][archiveTab]
                }
              </small>
              <h3>
                {
                  [
                    "Systems-minded creator",
                    "Code should become experience",
                    "Building Axon Override",
                  ][archiveTab]
                }
              </h3>
              <p>
                {
                  [
                    "I build interactive software where technical systems, visual design, and player experience reinforce one another.",
                    "The strongest portfolio is something visitors can understand by using—not only by reading.",
                    "This world is an evolving playable archive of projects, experiments, and engineering decisions.",
                  ][archiveTab]
                }
              </p>
            </article>
            {true ? (
              <div className="archive-practice">
                <small>UNITY // PROGRAMMING KNOWLEDGE CHECK</small>
                <p>{archivePractice[archivePrompt].question}</p>
                <div className="answer-grid">
                  {archiveOrder.map((answerIndex) => (
                    <button
                      key={archivePractice[archivePrompt].answers[answerIndex]}
                      className={archiveAnswer === answerIndex ? "selected" : ""}
                      onClick={() => setArchiveAnswer(answerIndex)}
                    >
                      {archivePractice[archivePrompt].answers[answerIndex]}
                    </button>
                  ))}
                </div>
                <button
                  className="activity-action"
                  disabled={archiveAnswer === null}
                  onClick={() => {
                    const correct =
                      archiveAnswer === archivePractice[archivePrompt].correct;
                    setChallengeNotice(
                      correct
                        ? completedMachines.includes("archive")
                          ? "ARCHIVE PRACTICE CLEARED // SCORE +100"
                          : "KNOWLEDGE CHECK VERIFIED"
                        : "REVIEW THE SYSTEM SIGNAL",
                    );
                    if (correct) {
                      if (completedMachines.includes("archive")) addPracticeScore();
                      else completeMachine("archive");
                      setArchivePrompt((archivePrompt + 1) % archivePractice.length);
                      setArchiveOrder(shuffle([0, 1, 2]));
                      setArchiveAnswer(null);
                    }
                  }}
                >
                  {completedMachines.includes("archive")
                    ? "SUBMIT PRACTICE RESPONSE"
                    : "VERIFY KNOWLEDGE CHECK"}
                </button>
              </div>
            ) : (
              <button
                className="activity-action"
                onClick={() => completeMachine("archive")}
              >
                SYNC MEMORY ARCHIVE
              </button>
            )}
          </div>
        )}
        {active.id === "forge" && (
          <div className="machine-activity">
            <div className="code-challenge">
              <div className="code-heading">
                <small>TRACE THE LOOP OUTPUT</small>
                <div className="language-tabs">
                  {(["C#", "Python", "JavaScript", "Java"] as ForgeLanguage[]).map(
                    (language) => (
                      <button
                        key={language}
                        className={loopLanguage === language ? "active" : ""}
                        onClick={() => {
                          setLoopLanguage(language);
                          setLoopResult(null);
                          setChallengeNotice(null);
                        }}
                      >
                        {language}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <pre><code>{forgeProgram(loopLanguage, loopMode, loopLimit)}</code></pre>
              <p>What value leaves the forge?</p>
              {loopStep >= 0 && (
                <div className="execution-output">
                  <small>PSEUDO EXECUTION // LIVE</small>
                  <code>
                    i = {loopMode === "product" ? loopStep + 1 : loopStep} |
                    signal = {loopExpression}
                    {loopStep === loopLimit - 1
                      ? ` == ${loopAnswer}`
                      : ""}
                  </code>
                </div>
              )}
            </div>
            <div className="answer-grid">
              {loopChoices.map((answer) => (
                <button
                  key={answer}
                  className={loopResult === String(answer) ? "selected" : ""}
                  onClick={() => {
                    setLoopResult(String(answer));
                    setChallengeNotice(
                      answer === loopAnswer
                        ? "TRACE VERIFIED"
                        : "OUTPUT MISMATCH",
                    );
                  }}
                >
                  {answer}
                </button>
              ))}
            </div>
            <button
              className="activity-action"
              disabled={loopResult !== String(loopAnswer)}
              onClick={() => {
                if (completedMachines.includes("forge")) {
                  addPracticeScore();
                  setChallengeNotice("PRACTICE CLEARED // SCORE +100");
                  generateForgePractice();
                } else completeMachine("forge");
              }}
            >
              {completedMachines.includes("forge")
                ? "SUBMIT PRACTICE TRACE"
                : "COMPILE SEQUENCE"}
            </button>
          </div>
        )}
        {active.id === "relay" && (
          <div className="machine-activity">
            <p className="activity-copy">
              Convert decimal <b>{relayTarget}</b> to an eight-bit binary
              signal. Current value: <b>{relayValue}</b>
            </p>
            <div className="relay-nodes">
              {relayNodes.map((on, i) => (
                <div className="relay-bit" key={relayBitValues[i]}>
                  <b>{relayBitValues[i]}</b>
                  <button
                    className={on ? "on" : ""}
                    onClick={() =>
                      setRelayNodes((v) =>
                        v.map((x, n) => (n === i ? !x : x)),
                      )
                    }
                  >
                    <i />
                    {on ? "1" : "0"}
                  </button>
                </div>
              ))}
            </div>
            <button
              className="activity-action"
              onClick={() => {
                const valid = relayValue === relayTarget;
                setChallengeNotice(
                  valid ? "CARRIER LOCKED" : "PATTERN REJECTED",
                );
                if (valid) {
                  if (completedMachines.includes("relay")) {
                    addPracticeScore();
                    setChallengeNotice("BINARY PRACTICE CLEARED // SCORE +100");
                    setRelayTarget(Math.floor(Math.random() * 128) + 1);
                    setRelayNodes(Array(8).fill(false));
                  } else completeMachine("relay");
                }
              }}
            >
              {completedMachines.includes("relay")
                ? "SUBMIT PRACTICE SIGNAL"
                : "TRANSMIT PATTERN"}
            </button>
          </div>
        )}
        {active.id === "nexus" && (
          <div className="machine-activity">
            {completedMachines.includes("nexus") ? (
              <div className="final-trophy">
                <div>♛</div>
                <span>SYSTEMS TRIAL SCORE</span>
                <b>{practiceScore.toLocaleString()}</b>
                <small>Practice stations remain online across the board.</small>
              </div>
            ) : (
              <>
                <div className="nexus-charge">
                  <span>CMOS ARRAY // FINAL GATE</span>
                  <b>{Math.min(9, collectedCount)}/9</b>
                  <div>
                    <i
                      style={{
                        width: `${Math.min(100, (collectedCount / 9) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="activity-copy">
                  Recover the other nine CMOS batteries. The Power Nexus will
                  synthesize the final Prism carrier only when the array is complete.
                </p>
                <button
                  className="activity-action"
                  disabled={collectedCount < 9}
                  onClick={() => completeMachine("nexus")}
                >
                  SYNTHESIZE FINAL CMOS
                </button>
              </>
            )}
          </div>
        )}
        {challengeNotice && (
          <div className="challenge-notice">{challengeNotice}</div>
        )}
        <div className="panel-grid">
          <article>
            <small>STATUS</small>
            <b>
              {completedMachines.includes(active.id)
                ? "SYNCHRONIZED"
                : "AVAILABLE"}
            </b>
          </article>
          <article>
            <small>CORE REWARD</small>
            <b>CMOS +1</b>
          </article>
        </div>
      </section>
    )}
  </>;
}
