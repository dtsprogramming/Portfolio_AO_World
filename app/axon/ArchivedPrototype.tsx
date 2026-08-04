import { useEffect, useRef, useState } from "react";

/** Selects between preserved Axon Override prototype cartridges. */
export function ArchivedPrototype({
  onExit,
  onComplete,
}: {
  onExit: () => void;
  onComplete: (score: number) => void;
}) {
  const [game, setGame] = useState<"menu" | "side" | "top">("menu");
  if (game === "side") return <SideScroller onExit={() => setGame("menu")} onComplete={onComplete} />;
  if (game === "top") return <TopDownPrototype onExit={() => setGame("menu")} onComplete={onComplete} />;
  return (
    <section className="prototype-overlay" aria-label="Axon Override prototype selector">
      <div className="prototype-shell prototype-menu">
        <header><span>AXON OVERRIDE // PROTOTYPE ARCHIVE</span><button onClick={onExit}>EXIT ARCHIVE</button></header>
        <div className="prototype-status"><b>SELECT A RECOVERED BUILD</b><span>TOUCH, KEYBOARD, AND CONTROLLER-FRIENDLY TESTS</span></div>
        <div className="prototype-game-select">
          <button onClick={() => setGame("side")}><small>BUILD 0.1</small><b>CIRCUIT RUNNER</b><span>SIDE-SCROLL // COLLECT + STOMP</span></button>
          <button onClick={() => setGame("top")}><small>BUILD 0.0</small><b>DATA RING MAZE</b><span>TOP-DOWN // COLLECT + ESCAPE</span></button>
          <div><small>BUILD 0.2</small><b>EMPTY CARTRIDGE</b><span>THIRD GAME RESERVED</span></div>
        </div>
      </div>
    </section>
  );
}

/** Runs the self-contained cartridge-era side-scroller shown by the archive. */
function SideScroller({
  onExit,
  onComplete,
}: {
  onExit: () => void;
  onComplete: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input = useRef({ x: 0, jump: false });
  const [circuits, setCircuits] = useState(0);
  const [viruses, setViruses] = useState(0);
  const [message, setMessage] = useState("COLLECT 10 CIRCUITS // REACH THE PORT");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const keys = new Set<string>();
    const player = { x: 70, y: 310, vx: 0, vy: 0, grounded: false, face: 1, invincible: 0 };
    const platforms = [
      [0,370,440,50],[510,370,310,50],[900,370,430,50],[1410,370,390,50],[1890,370,710,50],
      [190,292,130,18],[580,275,150,18],[990,285,120,18],[1190,225,125,18],
      [1480,290,135,18],[1690,235,115,18],[2000,285,150,18],[2250,220,150,18],
    ];
    const pickups = [230,610,760,1025,1235,1515,1735,2050,2300,2480].map((x, i) => ({ x, y: i % 3 === 1 ? 235 : i % 3 === 2 ? 185 : 330, got:false }));
    const enemies = [390,690,1080,1540,1760,2110,2380].map((x, i) => ({ x, y: 342, vx: i % 2 ? 42 : -42, alive:true }));
    let collected = 0, defeated = 0, cameraX = 0;
    let score = 1000;
    let last = performance.now();
    let frame = 0;
    let ended = false;
    const keydown = (event: KeyboardEvent) => {
      keys.add(event.key.toLowerCase());
      if ([" ", "w", "arrowup"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        input.current.jump = true;
      }
    };
    const keyup = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    addEventListener("keydown", keydown);
    addEventListener("keyup", keyup);
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!ended) score = Math.max(100, score - dt * 8);
      const ix = input.current.x + (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      player.vx += (ix * 190 - player.vx) * Math.min(1, dt * 11);
      if (Math.abs(ix) > .1) player.face = Math.sign(ix);
      if (input.current.jump && player.grounded) { player.vy = -470; player.grounded = false; }
      input.current.jump = false;
      const oldY = player.y;
      player.vy += 900 * dt; player.x = Math.max(18, Math.min(2575, player.x + player.vx * dt)); player.y += player.vy * dt; player.grounded = false;
      platforms.forEach(([x,y,w]) => {
        if (player.x+12>x && player.x-12<x+w && oldY+22<=y && player.y+22>=y && player.vy>=0) { player.y=y-22; player.vy=0; player.grounded=true; }
      });
      if (player.y > 470) { player.x=Math.max(35,cameraX+45); player.y=300; player.vy=0; score=Math.max(100,score-80); setMessage("SIGNAL LOST // CHECKPOINT RESTORED"); }
      player.invincible=Math.max(0,player.invincible-dt);
      pickups.forEach((p) => { if (!p.got && Math.hypot(player.x-p.x,player.y-p.y)<30) { p.got=true; collected++; setCircuits(collected); score+=50; setMessage(`CIRCUIT TRACE ${collected}/10`); } });
      enemies.forEach((e) => {
        if (!e.alive) return; e.x += e.vx*dt;
        if (e.x%400<35 || e.x%400>365) e.vx*=-1;
        if (Math.abs(player.x-e.x)<25 && Math.abs(player.y-e.y)<31 && player.invincible<=0) {
          if (player.vy>80 && player.y<e.y) { e.alive=false; player.vy=-245; defeated++; setViruses(defeated); score+=100; setMessage("VIRUS SMASHED"); }
          else { player.invincible=1.2; player.vx=-player.face*230; player.vy=-220; score=Math.max(100,score-60); setMessage("FIREWALL BREACH"); }
        }
      });
      if (!ended && collected >= 10 && player.x > 2525) {
        ended = true; setFinished(true); setMessage("ARCHIVED BUILD COMPLETE");
        onComplete(Math.round(score));
      }
      cameraX=Math.max(0,Math.min(1880,player.x-240));
      ctx.fillStyle="#050713"; ctx.fillRect(0,0,720,420);
      ctx.fillStyle="#0c1730"; for(let i=0;i<18;i++){const sx=(i*173-cameraX*.18)%760;ctx.fillRect(sx,45+(i%5)*31,2,2);}
      ctx.save(); ctx.translate(-cameraX,0);
      ctx.strokeStyle="#183c52"; ctx.lineWidth=2; for(let x=0;x<2600;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,420);ctx.stroke();}
      platforms.forEach(([x,y,w,h])=>{ctx.fillStyle="#162b2c";ctx.fillRect(x,y,w,h);ctx.fillStyle="#39d6b1";ctx.fillRect(x,y,w,4);for(let px=x+18;px<x+w;px+=38){ctx.fillStyle="#d87c31";ctx.fillRect(px,y+12,13,4);}});
      pickups.forEach((p)=>{if(p.got)return;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(now/500);ctx.fillStyle="#ffd84d";ctx.fillRect(-8,-8,16,16);ctx.fillStyle="#fff3a0";ctx.fillRect(-3,-3,6,6);ctx.restore();});
      enemies.forEach((e)=>{if(!e.alive)return;ctx.fillStyle="#ff4f75";ctx.fillRect(e.x-16,e.y-17,32,25);ctx.fillStyle="#07100e";ctx.fillRect(e.x-9,e.y-10,5,5);ctx.fillRect(e.x+5,e.y-10,5,5);ctx.fillStyle="#ff8ba5";ctx.fillRect(e.x-21,e.y-8,5,16);ctx.fillRect(e.x+16,e.y-8,5,16);});
      ctx.fillStyle=collected>=10?"#c8ff55":"#263b34";ctx.fillRect(2535,270,45,100);ctx.strokeStyle="#c8ff55";ctx.strokeRect(2535,270,45,100);
      if(player.invincible<=0||Math.floor(now/90)%2===0){ctx.save();ctx.translate(player.x,player.y);ctx.scale(player.face,1);ctx.fillStyle="#7cf5ff";ctx.fillRect(-11,-29,22,20);ctx.fillStyle="#aeb9b8";ctx.fillRect(-14,-8,28,22);ctx.fillStyle="#43e5c4";ctx.fillRect(5,-24,4,4);ctx.fillStyle="#1a2423";ctx.beginPath();ctx.arc(0,18,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#43e5c4";ctx.stroke();ctx.restore();}
      ctx.restore();
      ctx.fillStyle="#8ca69e";ctx.font="12px monospace";ctx.fillText(`SCORE ${Math.round(score)}   CIRCUITS ${collected}/10   VIRUSES ${defeated}`,18,24);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); removeEventListener("keydown", keydown); removeEventListener("keyup", keyup); };
  }, [onComplete]);

  const move = (x: number) => { input.current.x = x; };
  return (
    <section className="prototype-overlay" aria-label="Axon Override archived prototype">
      <div className="prototype-shell">
        <header><span>{"AXON OVERRIDE // ARCHIVED BUILD 0.1"}</span><button onClick={onExit}>EXIT ARCHIVE</button></header>
        <div className="prototype-status"><b>{message}</b><span>{`CIRCUITS ${circuits}/10 // VIRUSES ${viruses} // MOVE + JUMP + STOMP`}</span></div>
        <canvas ref={canvasRef} width="720" height="420" />
        <div className="prototype-mobile">
          <div className="prototype-pad">
            <button onPointerDown={() => move(-1)} onPointerUp={() => move(0)}>◀</button>
            <button onPointerDown={() => move(1)} onPointerUp={() => move(0)}>▶</button>
          </div>
          <div className="prototype-actions"><button onPointerDown={() => { input.current.jump = true; }}>JUMP</button></div>
        </div>
        {finished && <button className="prototype-return" onClick={onExit}>RETURN TO MAINBOARD</button>}
      </div>
    </section>
  );
}

/** A bounded overhead prototype with an explicit data-ring objective and locked exit. */
function TopDownPrototype({ onExit, onComplete }: { onExit: () => void; onComplete: (score: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input = useRef({ x: 0, y: 0 });
  const [rings, setRings] = useState(0);
  const [message, setMessage] = useState("COLLECT 8 DATA RINGS // UNLOCK THE EXIT");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const keys = new Set<string>();
    const player = { x: 62, y: 350, invincible: 0 };
    const walls = [
      [18,48,684,14],[18,392,684,14],[18,48,14,358],[688,48,14,358],
      [140,48,14,252],[260,140,14,252],[380,48,14,252],
      [500,140,14,252],[610,48,14,252],
    ];
    const data = [[70,92],[188,350],[188,92],[320,92],[320,350],[442,350],[558,92],[654,350]].map(([x,y]) => ({x,y,got:false}));
    const enemies = [
      { x: 92, y: 220, axis: "y", min: 100, max: 350, speed: 72, direction: 1 },
      { x: 200, y: 206, axis: "x", min: 166, max: 242, speed: 58, direction: 1 },
      { x: 326, y: 215, axis: "y", min: 82, max: 365, speed: 82, direction: -1 },
      { x: 445, y: 330, axis: "x", min: 415, max: 482, speed: 64, direction: -1 },
      { x: 555, y: 175, axis: "y", min: 82, max: 365, speed: 76, direction: 1 },
      { x: 650, y: 220, axis: "y", min: 90, max: 350, speed: 88, direction: -1 },
    ];
    let collected = 0, score = 1200, ended = false, frame = 0, last = performance.now();
    const down = (event: KeyboardEvent) => { keys.add(event.key.toLowerCase()); if (event.key.startsWith("Arrow")) event.preventDefault(); };
    const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    addEventListener("keydown", down); addEventListener("keyup", up);
    const collides = (x: number, y: number) => walls.some(([wx,wy,ww,wh]) => x+9>wx && x-9<wx+ww && y+9>wy && y-9<wy+wh);
    const loop = (now: number) => {
      const dt = Math.min(.034, (now-last)/1000); last=now;
      const dx = input.current.x + (keys.has("d")||keys.has("arrowright")?1:0) - (keys.has("a")||keys.has("arrowleft")?1:0);
      const dy = input.current.y + (keys.has("s")||keys.has("arrowdown")?1:0) - (keys.has("w")||keys.has("arrowup")?1:0);
      const length = Math.max(1, Math.hypot(dx,dy));
      const nx=player.x+dx/length*145*dt, ny=player.y+dy/length*145*dt;
      if(!collides(nx,player.y)) player.x=nx; if(!collides(player.x,ny)) player.y=ny;
      player.invincible=Math.max(0,player.invincible-dt);
      enemies.forEach((enemy)=>{
        if(enemy.axis==="x") enemy.x+=enemy.speed*enemy.direction*dt; else enemy.y+=enemy.speed*enemy.direction*dt;
        const value=enemy.axis==="x"?enemy.x:enemy.y;
        if(value<=enemy.min||value>=enemy.max){enemy.direction*=-1;if(enemy.axis==="x")enemy.x=Math.max(enemy.min,Math.min(enemy.max,enemy.x));else enemy.y=Math.max(enemy.min,Math.min(enemy.max,enemy.y));}
        if(player.invincible<=0&&Math.hypot(player.x-enemy.x,player.y-enemy.y)<19){
          player.x=62;player.y=350;player.invincible=.8;score=Math.max(100,score-75);setMessage("VIRUS COLLISION // SIGNAL RETURNED TO ENTRY");
        }
      });
      if(!ended) score=Math.max(100,score-dt*7);
      data.forEach((ring)=>{if(!ring.got&&Math.hypot(player.x-ring.x,player.y-ring.y)<18){ring.got=true;collected++;score+=75;setRings(collected);setMessage(collected===8?"EXIT ONLINE // REACH THE GREEN PORT":`DATA RING SECURED ${collected}/8`);}});
      if(!ended&&collected===8&&player.x>650&&player.y>315){ended=true;setFinished(true);setMessage("ARCHIVED BUILD COMPLETE");onComplete(Math.round(score));}
      ctx.fillStyle="#030910";ctx.fillRect(0,0,720,420);
      ctx.strokeStyle="#0c3040";ctx.lineWidth=1;for(let x=0;x<720;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,420);ctx.stroke();}for(let y=0;y<420;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(720,y);ctx.stroke();}
      walls.forEach(([x,y,w,h],i)=>{ctx.fillStyle="#14272b";ctx.fillRect(x,y,w,h);ctx.fillStyle=i<4?"#ff9b42":"#36d9c0";ctx.fillRect(x,y,w,3);});
      data.forEach((ring)=>{if(ring.got)return;ctx.strokeStyle="#ffd84d";ctx.lineWidth=3;ctx.beginPath();ctx.arc(ring.x,ring.y,9+Math.sin(now/180)*1.5,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#fff0a0";ctx.fillRect(ring.x-2,ring.y-2,4,4);});
      enemies.forEach((enemy)=>{ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(now/600);ctx.fillStyle="#ff4f75";ctx.fillRect(-9,-9,18,18);ctx.fillStyle="#07100e";ctx.fillRect(-4,-4,3,3);ctx.fillRect(2,-4,3,3);ctx.strokeStyle="#ff9ab0";ctx.strokeRect(-12,-12,24,24);ctx.restore();});
      ctx.fillStyle=collected===8?"#c8ff55":"#293a35";ctx.fillRect(660,320,28,62);ctx.strokeStyle="#c8ff55";ctx.strokeRect(660,320,28,62);
      if(player.invincible<=0||Math.floor(now/90)%2===0){ctx.fillStyle="#9efaff";ctx.fillRect(player.x-8,player.y-8,16,16);ctx.fillStyle="#c56cff";ctx.fillRect(player.x-3,player.y-3,6,6);}
      ctx.fillStyle="#a8c5be";ctx.font="12px monospace";ctx.fillText(`DATA RINGS ${collected}/8    SCORE ${Math.round(score)}`,18,24);
      if(now<5000){ctx.fillStyle="#061511e8";ctx.fillRect(180,178,360,64);ctx.strokeStyle="#ffd84d";ctx.strokeRect(180,178,360,64);ctx.fillStyle="#ffd84d";ctx.textAlign="center";ctx.fillText("COLLECT EVERY GLOWING DATA RING",360,204);ctx.fillStyle="#9bb8b1";ctx.fillText("THE EAST EXIT OPENS AT 8/8",360,225);ctx.textAlign="left";}
      frame=requestAnimationFrame(loop);
    };
    frame=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(frame);removeEventListener("keydown",down);removeEventListener("keyup",up);};
  }, [onComplete]);
  const move=(x:number,y:number)=>{input.current={x,y};};
  return <section className="prototype-overlay" aria-label="Top-down Axon Override prototype"><div className="prototype-shell">
    <header><span>AXON OVERRIDE // ARCHIVED BUILD 0.0</span><button onClick={onExit}>GAME SELECT</button></header>
    <div className="prototype-status"><b>{message}</b><span>DATA RINGS {rings}/8 // MOVE // FIND THE EAST EXIT</span></div>
    <canvas ref={canvasRef} width="720" height="420" />
    <div className="prototype-mobile"><div className="prototype-dpad"><button onPointerDown={()=>move(0,-1)} onPointerUp={()=>move(0,0)}>UP</button><button onPointerDown={()=>move(-1,0)} onPointerUp={()=>move(0,0)}>LEFT</button><button onPointerDown={()=>move(1,0)} onPointerUp={()=>move(0,0)}>RIGHT</button><button onPointerDown={()=>move(0,1)} onPointerUp={()=>move(0,0)}>DOWN</button></div></div>
    {finished&&<button className="prototype-return" onClick={onExit}>RETURN TO GAME SELECT</button>}
  </div></section>;
}
