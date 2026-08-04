import type { CSSProperties } from "react";
import { profileSite } from "./worldData";

/**
 * Scannable identity hologram containing personal, game-development, and
 * toolkit galleries plus external portfolio links.
 */
export function ProfilePanel({
  open,
  activeTab,
  onTabChange,
  onClose,
}: {
  open: boolean;
  activeTab: number;
  onTabChange: (tab: number) => void;
  onClose: () => void;
}) {
  const profileTab = activeTab;
  const setProfileTab = onTabChange;

  return <>
{open && (
      <section
        className="machine-panel interactive-panel profile-panel"
        style={{ "--machine": profileSite.color } as CSSProperties}
      >
        <button className="close" onClick={onClose}>
          ×
        </button>
        <span>HOLOGRAM // IDENTITY RECORD</span>
        <h2>DANIEL SILVA</h2>
        <p>Creative developer // gameplay systems // interactive software</p>
        <div className="profile-tabs">
          {["PERSONAL", "GAME DEV", "TOOLKIT"].map((label, index) => (
            <button
              key={label}
              className={profileTab === index ? "active" : ""}
              onClick={() => setProfileTab(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="profile-gallery">
          {profileTab === 2 ? (
            <div className="toolkit-grid" aria-label="Development technologies">
              {[
                ["U", "UNITY"], ["C#", "C SHARP"],
                ["JS", "JAVASCRIPT"], ["TS", "TYPESCRIPT"],
                ["PY", "PYTHON"], ["JV", "JAVA"],
                ["R", "REACT"], ["3", "THREE.JS"],
              ].map(([icon, label]) => (
                <div className="toolkit-cell" key={label}>
                  <b aria-hidden="true">{icon}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          ) : (
            // The hosted standalone build serves these public assets directly.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileTab === 1 ? "/game-project-atlas.png" : "/daniel-silva-profile.png"}
              alt={profileTab === 1 ? "Game development project gallery" : "Daniel Silva"}
              width={960}
              height={540}
            />
          )}
          <article>
            <small>
              {[
                "PERSONAL PROFILE",
                "SELECTED GAME DEVELOPMENT",
                "DEVELOPMENT TOOLKIT",
              ][profileTab]}
            </small>
            <h3>
              {[
                "Systems-minded creative developer",
                "Gameplay built through experimentation",
                "Code, engines, and interaction design",
              ][profileTab]}
            </h3>
            <p>
              {[
                "I build interactive experiences where engineering, visual design, and player feedback reinforce one another. Axon Override turns that approach into a world you can explore.",
                "My game-development work focuses on Unity prototypes, responsive character systems, environmental interaction, puzzle mechanics, and learning through playable iteration.",
                "Unity, C#, JavaScript, TypeScript, Python, Java, React, Three.js, systems design, rapid prototyping, debugging, and experience-focused UI.",
              ][profileTab]}
            </p>
            {profileTab === 1 && (
              <a
                className="itch-link"
                href="https://dtsprogramming.itch.io"
                target="_blank"
                rel="noreferrer"
              >
                OPEN ITCH.IO PROFILE <span aria-hidden="true">↗</span>
              </a>
            )}
            {profileTab === 2 && (
              <>
                <p className="codex-credit">
                  THIS SITE WAS CREATED IN COLLABORATION WITH CHATGPT CODEX.
                </p>
                <a
                  className="itch-link"
                  href="https://github.com/dtsprogramming"
                  target="_blank"
                  rel="noreferrer"
                >
                  SEE BUILD HERE <span aria-hidden="true">&#8599;</span>
                </a>
              </>
            )}
          </article>
        </div>
      </section>
    )}
  </>;
}
