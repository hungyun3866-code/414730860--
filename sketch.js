let video, handpose, predictions = [];
let score = 0, currentLevel = 1, gameStatus = "START", isModelLoaded = false;
let target = { x: 320, y: 240, curX: 320, curY: 240, lastMove: 0 };
let timer = 60, startTime, lastHitTime = 0, countStart, quizStart;
let particles = [], burstParticles = [];
let questions = [
  { q: "p5.js 中用什麼函式來繪製圓形？", options: ["ellipse()", "rect()", "circle()"], ans: 0 },
  { q: "setup() 函式執行幾次？", options: ["無限次", "只執行一次", "每幀執行"], ans: 1 },
  { q: "背景顏色是由哪個函式設定？", options: ["color()", "stroke()", "background()"], ans: 2 }
];
let currentQuiz, quizState = "PREVIEW", quizIndex = 0, quizFeedback = { status: "NONE", msg: "", time: 0 };

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO); video.size(640, 480); video.hide();
  handpose = ml5.handpose(video, () => { isModelLoaded = true; });
  handpose.on("predict", results => { predictions = results; });
  for (let i = 0; i < 60; i++) particles.push(new Particle());
}

function draw() {
  push(); translate(width, 0); scale(-1, 1);
  image(video, 0, 0, width, height); pop();
  for (let p of particles) { p.update(); p.display(); }
  for (let i = burstParticles.length - 1; i >= 0; i--) {
    let p = burstParticles[i]; p.update(); p.display();
    if (p.alpha <= 0) burstParticles.splice(i, 1);
  }

  if (gameStatus === "START") drawStartScreen();
  else if (gameStatus === "COUNTDOWN") drawCountdown();
  else if (gameStatus === "PLAY") drawGamePlay();
  else if (gameStatus === "LEVEL_UP") drawLevelUpScreen();
  else if (gameStatus === "PRE_QUIZ") drawPreQuiz();
  else if (gameStatus === "QUIZ") drawQuizManager();
  else if (gameStatus === "END") drawGameOver();
}

function drawStartScreen() {
  rectMode(CORNER); fill(50, 50, 50, 150); rect(0, 0, width, height);
  fill(255); textAlign(CENTER, CENTER); textSize(45); text("STAR CATCHER", width/2, 60);
  textSize(22); text("414730860 洪千涵", width/2, 100);
  fill(isModelLoaded ? color(100, 255, 100) : color(255, 200, 0));
  textSize(20); text(isModelLoaded ? "系統就緒，觸碰按鈕開始" : "模型載入中...", width/2, 160);
  rectMode(CENTER); fill(150); rect(width/2, 300, 200, 50);
  fill(255); text("開始遊戲", width/2, 300);
  if (isModelLoaded && predictions.length > 0) {
    let f = predictions[0].landmarks[8];
    if (dist(width-f[0], f[1], width/2, 300) < 50) { gameStatus = "COUNTDOWN"; countStart = millis(); }
  }
}

function drawCountdown() {
  rectMode(CORNER); fill(50, 50, 50, 150); rect(0, 0, width, height);
  let count = 3 - floor((millis() - countStart) / 1000);
  fill(255); textSize(80); text(count > 0 ? count : "GO!", width/2, height/2);
  if (count < 0) { score = 0; timer = 60; startTime = millis(); gameStatus = "PLAY"; }
}

function drawGamePlay() {
  timer = 60 - floor((millis() - startTime) / 1000);
  if (timer <= 0) gameStatus = "END";
  if (score >= 30) { if(currentLevel==1) gameStatus = "LEVEL_UP"; else gameStatus = "PRE_QUIZ"; }
  
  fill(0, 150); noStroke(); rect(10, 10, 320, 95, 10);
  fill(255); textAlign(LEFT, TOP); textSize(16);
  text(`Level: ${currentLevel} | Score: ${score} | Time: ${timer}`, 20, 20);
  text(currentLevel == 1 ? "說明：用指尖碰觸紅色圓形 (絲滑移動)" : "說明：用指尖碰觸星星 (1秒換位)", 20, 45);
  text("目標：得到30分即可過關", 20, 70);

  if (currentLevel == 1) { target.curX = lerp(target.curX, target.x, 0.1); target.curY = lerp(target.curY, target.y, 0.1); }
  else { target.curX = target.x; target.curY = target.y; if (millis() - target.lastMove > 1000) moveTarget(); }
  
  fill(currentLevel==1 ? color(255,50,50) : color(255,215,0));
  if(currentLevel==1) ellipse(target.curX, target.curY, 50); else drawStar(target.curX, target.curY, 20, 50, 5);

  if (predictions.length > 0) {
    let f = predictions[0].landmarks[8];
    if (dist(width-f[0], f[1], target.curX, target.curY) < 60 && millis() - lastHitTime > 500) {
      score++; lastHitTime = millis();
      for(let i=0; i<8; i++) burstParticles.push(new Burst(target.curX, target.curY));
      moveTarget();
    }
  }
}

function drawLevelUpScreen() {
  rectMode(CORNER); fill(50, 50, 50, 150); rect(0, 0, width, height);
  fill(255); textAlign(CENTER, CENTER); textSize(30); text("過關！準備第二關！", width/2, 200);
  fill(100, 200, 100); rect(width/2-100, 325, 200, 50);
  fill(255); text("開始挑戰", width/2, 350);
  if (predictions.length > 0 && dist(width-predictions[0].landmarks[8][0], predictions[0].landmarks[8][1], width/2, 350) < 50) 
    { currentLevel = 2; score = 0; startTime = millis(); gameStatus = "PLAY"; }
}

function drawPreQuiz() {
  rectMode(CORNER); fill(50, 50, 50, 200); rect(0, 0, width, height);
  fill(255); textAlign(CENTER, CENTER); textSize(30);
  text("準備進入最終問答關！\n請準備好握拳選擇答案", width/2, 200);
  fill(100, 200, 100); rect(width/2-100, 325, 200, 50);
  fill(255); text("開始答題", width/2, 350);
  if (predictions.length > 0 && dist(width-predictions[0].landmarks[8][0], predictions[0].landmarks[8][1], width/2, 350) < 50) 
    { currentQuiz = random(questions); quizIndex = 0; quizState = "PREVIEW"; quizStart = millis(); gameStatus = "QUIZ"; }
}

function drawQuizManager() {
  if (quizState === "PREVIEW") {
    rectMode(CORNER); fill(0, 0, 0, 220); rect(0, 0, width, height);
    fill(255); textSize(26); textAlign(CENTER, CENTER);
    text("請詳閱題目 (5秒後開始)：\n" + currentQuiz.q, width/2, height/2);
    if (millis() - quizStart > 5000) { quizState = "ANSWERING"; }
  } else if (quizState === "FEEDBACK") {
    rectMode(CORNER); fill(0, 0, 0, 220); rect(0, 0, width, height);
    fill(255); textSize(30); text(quizFeedback.msg, width/2, height/2);
    if (millis() - quizFeedback.time > 2000) {
      quizIndex++;
      if (quizIndex < 3) { currentQuiz = random(questions); quizState = "PREVIEW"; quizStart = millis(); }
      else gameStatus = "END";
    }
  } else {
    fill(0, 150); noStroke(); rect(10, 10, 300, 50, 10);
    fill(255); textAlign(LEFT, TOP); textSize(16); text("說明：請握拳選擇正確答案", 20, 25);
    fill(50, 200); rect(0, 70, width, height-70);
    textAlign(CENTER, CENTER); textSize(20); text(`第 ${quizIndex+1}/3 題: ${currentQuiz.q}`, width/2, 100);
    for(let i=0; i<3; i++) {
      fill(100); rect(width/2-150, 160+i*90, 300, 60, 10);
      fill(255); text(currentQuiz.options[i], width/2, 190+i*90);
    }
    if (predictions.length > 0 && isFist()) {
      let f = predictions[0].landmarks[8]; let tx = width - f[0], ty = f[1];
      for(let i=0; i<3; i++) {
        if (tx > width/2-150 && tx < width/2+150 && ty > 160+i*90 && ty < 220+i*90) {
          if (i === currentQuiz.ans) {
            quizFeedback = { msg: "恭喜答對！", time: millis() };
            for(let k=0; k<15; k++) burstParticles.push(new Burst(width/2, 200+i*90));
            quizState = "FEEDBACK";
          } else {
            quizFeedback = { msg: "答錯了！正確是: " + currentQuiz.options[currentQuiz.ans], time: millis() };
            quizState = "FEEDBACK";
          }
        }
      }
    }
  }
}

function drawGameOver() {
  rectMode(CORNER); fill(50, 50, 50, 200); rect(0, 0, width, height);
  fill(255); textAlign(CENTER, CENTER); textSize(40);
  text(quizIndex >= 3 ? "恭喜全數過關！" : "遊戲結束", width/2, 200);
  fill(100, 100, 255); rect(width/2-100, 325, 200, 50);
  fill(255); text("重新遊玩", width/2, 350);
  if (predictions.length > 0 && dist(width-predictions[0].landmarks[8][0], predictions[0].landmarks[8][1], width/2, 350) < 50) 
    { score = 0; currentLevel = 1; quizIndex = 0; gameStatus = "START"; }
}

function isFist() { return dist(predictions[0].landmarks[8][0], predictions[0].landmarks[8][1], predictions[0].landmarks[0][0], predictions[0].landmarks[0][1]) < 60; }
function drawStar(x, y, r1, r2, n) { let a = TWO_PI/n; beginShape(); for (let i=0; i<TWO_PI; i+=a) { vertex(x+cos(i)*r2, y+sin(i)*r2); vertex(x+cos(i+a/2)*r1, y+sin(i+a/2)*r1); } endShape(CLOSE); }
function moveTarget() { target.lastMove = millis(); target.x = random(80, width-80); target.y = random(80, height-80); }
class Particle { constructor() { this.x=random(width); this.y=random(height); this.size=random(2,5); } update() { this.y-=0.5; if(this.y<0) this.y=height; } display() { fill(255, 100); ellipse(this.x, this.y, this.size); } }
class Burst { constructor(x, y) { this.x=x; this.y=y; this.vx=random(-5,5); this.vy=random(-5,5); this.alpha=255; } update() { this.x+=this.vx; this.y+=this.vy; this.alpha-=10; } display() { fill(255, 215, 0, this.alpha); ellipse(this.x, this.y, 10); } }