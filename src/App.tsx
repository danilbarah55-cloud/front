import { useEffect } from 'react';
import { bootGame } from './game/ui.ts';

export default function App() {
  useEffect(() => {
    return bootGame();
  }, []);

  return (
    <>
      <div id="app">
        <div id="hud">
          <button className="hb" id="bMenu" aria-label="Меню">
            <svg className="ic" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hc money">
            <div>
              <small>
                <svg className="ic f c-money" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Деньги<em id="sInc"></em>
              </small>
              <b id="sMoney">0</b>
            </div>
          </div>
          <div className="hc en">
            <div>
              <small>
                <svg className="ic f c-en" viewBox="0 0 24 24">
                  <path d="M13 2 5 14h6l-1 8 8-12h-6z" />
                </svg>
                Энергия
              </small>
              <b id="sEn">0/0</b>
            </div>
            <i className="bar">
              <u id="enBar"></u>
            </i>
          </div>
          <div className="hc">
            <div>
              <small>
                <svg className="ic f c-sol" viewBox="0 0 24 24">
                  <path d="M5 14a7 7 0 0 1 14 0v2H5zM3 17h18v2H3z" />
                </svg>
                Солдаты
              </small>
              <b id="sSol">0</b>
            </div>
          </div>
          <div className="hc land">
            <div>
              <small>
                <svg className="ic c-land" viewBox="0 0 24 24">
                  <path d="M5 3v18M5 4h12l-2 4 2 4H5" />
                </svg>
                Земля
              </small>
              <b id="sLand">0%</b>
            </div>
            <i className="bar">
              <u id="landBar"></u>
            </i>
          </div>
        </div>

        <div id="wrap">
          <canvas id="cv"></canvas>
          <canvas id="mm" width={160} height={104}></canvas>
          <div id="ctl">
            <button className="cb" id="bSpd" aria-label="Скорость">
              <b style={{ position: 'static', fontSize: 16 }}>×1</b>
            </button>
            <button className="cb" id="bHome" aria-label="К столице">
              <svg className="ic" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </button>
            <button className="cb" id="bSnd" aria-label="Звук">
              <svg className="ic f" viewBox="0 0 24 24">
                <path d="M3 9h4l5-4v14l-5-4H3z" />
                <path
                  id="sndW"
                  d="M15 9q3 3 0 6M18 6q6 6 0 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                />
              </svg>
            </button>
            <button className="cb" id="bRank" aria-label="Рейтинг">
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M4 20V11h4v9M10 20V5h4v15M16 20v-6h4v6" />
              </svg>
            </button>
            <button className="cb" id="bDip" aria-label="Дипломатия">
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M2 12l5-4 4 2 3-2 4 3 4-2M5 11l5 6 3-2 1 2 3-3M2 12v5h3M22 11v5h-3" />
              </svg>
            </button>
            <button className="cb" id="bChat" aria-label="Чат" hidden>
              <svg className="ic" viewBox="0 0 24 24">
                <path d="M4 5h16v11H10l-5 4v-4H4z" />
              </svg>
            </button>
          </div>
          <div id="rank" hidden></div>
          <div id="count" hidden>
            <b id="cT">5.0</b>
            <div id="bt">
              <i id="cB"></i>
            </div>
            <span>Води пальцем: земля берётся не дальше 5 км от твоей</span>
          </div>
          <div id="goal" hidden></div>
          <div id="offer" hidden>
            <span id="offT"></span>
            <button id="offY">Принять</button>
            <button id="offN">Отказать</button>
          </div>
          <div id="dipBox" hidden></div>
          <div id="alarm" hidden></div>
          <div id="zoom">
            <button id="zin" aria-label="Приблизить">
              +
            </button>
            <button id="zout" aria-label="Отдалить">
              −
            </button>
          </div>
          <div id="info" hidden>
            <span id="infT"></span>
            <button id="infR">Починить</button>
            <button id="infX">Закрыть</button>
          </div>
          <div id="hint"></div>
          <div id="chatBox" hidden>
            <div id="chatLog"></div>
            <div id="chatRow">
              <input id="chatInput" maxLength={120} placeholder="Сообщение…" autoComplete="off" />
              <button id="chatSend">➤</button>
            </div>
          </div>
        </div>
        <div id="bar"></div>
      </div>
      <div id="scr" hidden></div>
      <div id="ov" hidden>
        <div className="card">
          <h1 id="ovT"></h1>
          <div id="ovP"></div>
          <button className="big" id="ovB"></button>
          <button className="sec" id="ovB2" hidden></button>
        </div>
      </div>
      <div id="load" hidden></div>
      <div id="toast"></div>
    </>
  );
}
