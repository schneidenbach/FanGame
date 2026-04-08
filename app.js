const fanField = document.getElementById("fan-field");
const taskTitle = document.getElementById("task-title");
const taskInstructions = document.getElementById("task-instructions");
const scenePrompt = document.getElementById("scene-prompt");
const clickTarget = document.getElementById("click-target");
const targetColorChip = document.getElementById("target-color-chip");
const wordCard = document.getElementById("word-card");
const wordHint = document.getElementById("word-hint");
const wordTrack = document.getElementById("word-track");
const roundPill = document.getElementById("round-pill");
const starsCount = document.getElementById("stars-count");
const starsTrack = document.getElementById("stars-track");
const awakeCount = document.getElementById("awake-count");
const breezeLevel = document.getElementById("breeze-level");
const statusText = document.getElementById("status-text");
const soundToggle = document.getElementById("sound-toggle");
const restartButton = document.getElementById("restart-button");
const sizeSlider = document.getElementById("size-slider");
const sizeLabel = document.getElementById("size-label");

const TOTAL_ROUNDS = 8;
const ROUND_PATTERN = ["click", "click", "word", "click", "word", "click", "word", "click"];
const LETTER_BANK = ["F", "A", "N", "S", "D", "J", "K", "L"];
const SIZE_PRESETS = [
  { label: "Small", scale: 1 },
  { label: "Medium", scale: 1.18 },
  { label: "Large", scale: 1.34 }
];

const fanDefinitions = [
  {
    id: "hero",
    label: "rainbow fan",
    shortLabel: "rainbow",
    x: 50,
    y: 46,
    size: 214,
    speed: 1,
    accent: "#ffd36f",
    sticker: "#ffd36f",
    ring: "rgb",
    special: true
  },
  {
    id: "green",
    label: "green fan",
    shortLabel: "green",
    x: 20,
    y: 30,
    size: 146,
    speed: 0,
    accent: "#79ddb6",
    sticker: "#79ddb6"
  },
  {
    id: "blue",
    label: "blue fan",
    shortLabel: "blue",
    x: 31,
    y: 66,
    size: 132,
    speed: 1,
    accent: "#83c4ff",
    sticker: "#83c4ff"
  },
  {
    id: "gold",
    label: "yellow fan",
    shortLabel: "yellow",
    x: 78,
    y: 31,
    size: 148,
    speed: 0,
    accent: "#ffd36f",
    sticker: "#ffd36f"
  },
  {
    id: "red",
    label: "red fan",
    shortLabel: "red",
    x: 86,
    y: 70,
    size: 132,
    speed: 0,
    accent: "#ff8473",
    sticker: "#ff8473"
  },
  {
    id: "white",
    label: "white fan",
    shortLabel: "white",
    x: 58,
    y: 21,
    size: 124,
    speed: 1,
    accent: "#b8f3ff",
    sticker: "#b8f3ff"
  },
  {
    id: "orange",
    label: "orange fan",
    shortLabel: "orange",
    x: 60,
    y: 78,
    size: 116,
    speed: 0,
    accent: "#ffb56c",
    sticker: "#ffb56c"
  }
];

let fans = [];
let state = {};
let audioState = {
  enabled: true,
  context: null
};
let dragState = null;

restartButton.addEventListener("click", resetGame);
soundToggle.addEventListener("click", () => {
  unlockAudio();
  audioState.enabled = !audioState.enabled;
  renderSoundToggle();
  setStatus(audioState.enabled ? "Sound is on." : "Sound is off.");
});
sizeSlider.addEventListener("input", () => {
  state.sizeIndex = Number(sizeSlider.value);
  renderSizeControl();
  renderFans();
});

fanField.addEventListener("click", (event) => {
  const speedChoice = event.target.closest(".fan-speed-choice");
  if (speedChoice && state.finished) {
    const fan = currentSelectedFan();
    fan.speed = Number(speedChoice.dataset.speedChoice);
    renderFans();
    updateHud();
    playFanBoost();
    setStatus(`${fan.shortLabel} fan speed is ${fan.speed}.`);
    return;
  }

  const button = event.target.closest(".fan-button");
  if (!button) {
    return;
  }

  unlockAudio();

  const fan = fans.find((item) => item.id === button.dataset.fanId);
  if (!fan) {
    return;
  }

  if (state.finished) {
    selectFan(fan.id);
    playSoftWhoosh();
    return;
  }

  if (!state.currentTask || state.currentTask.type !== "click") {
    setStatus(`Nice tap. Now do this task: ${state.currentTask.instructions}`);
    wobble(button);
    playSoftWhoosh();
    return;
  }

  if (fan.id !== state.currentTask.targetId) {
    setStatus(`That is the ${fan.shortLabel}. Tap the ${targetFan().shortLabel}.`);
    wobble(button);
    playWrongClick();
    return;
  }

  boostFan(fan, 1);
  celebrate(button);
  playFanBoost();
  completeTask(`${fan.shortLabel} is spinning faster.`);
});

window.addEventListener("keydown", (event) => {
  if (state.finished || !state.currentTask || state.currentTask.type !== "word") {
    return;
  }

  const key = event.key.toUpperCase();
  if (key.length !== 1 || !/[A-Z]/.test(key)) {
    return;
  }

  unlockAudio();

  const expected = state.currentTask.word[state.wordProgress];
  if (key !== expected) {
    wordTrack.classList.remove("is-wrong");
    void wordTrack.offsetWidth;
    wordTrack.classList.add("is-wrong");
    setStatus(`That was ${key}. Try ${expected}.`);
    playWrongKey();
    return;
  }

  state.wordProgress += 1;
  playRightKey();

  if (state.wordProgress < state.currentTask.word.length) {
    setStatus(`${key} is right. Next letter: ${state.currentTask.word[state.wordProgress]}.`);
    renderWordTrack();
    return;
  }

  const fan = targetFan();
  boostFan(fan, 1);
  playWordWin();
  completeTask(`${state.currentTask.word} made the ${fan.shortLabel} spin faster.`);
});
fanField.addEventListener("pointerdown", handlePointerDown);

resetGame();

function resetGame() {
  fans = fanDefinitions.map((fan) => ({ ...fan, speed: fan.speed }));
  state = {
    round: 0,
    stars: 0,
    currentTask: null,
    wordProgress: 0,
    lastFanId: "",
    lastWord: "",
    finished: false,
    selectedFanId: "hero",
    sizeIndex: Number(sizeSlider.value || 1)
  };

  renderStars();
  pickNextTask();
  renderFans();
  updateHud();
  renderSoundToggle();
  renderSizeControl();
  setStatus("Tap the glowing fan to begin.");
}

function pickNextTask() {
  if (state.stars >= TOTAL_ROUNDS) {
    finishGame();
    return;
  }

  const taskType = ROUND_PATTERN[state.stars];
  state.round = state.stars + 1;
  state.wordProgress = 0;

  if (taskType === "click") {
    const fan = chooseClickFan();
    state.currentTask = {
      type: "click",
      targetId: fan.id,
      title: "Tap This Color",
      instructions: `Find the fan with this color.`,
      prompt: `Tap the ${fan.shortLabel} fan.`
    };
  } else {
    const fan = chooseWordFan();
    const letters = chooseLetters();
    state.currentTask = {
      type: "word",
      targetId: fan.id,
      title: letters.length === 1 ? "Type This Letter" : "Type These Letters",
      instructions: `Press the big letter keys.`,
      prompt: `Type the big letters for the ${fan.shortLabel} fan.`,
      word: letters
    };
  }

  updateTaskUi();
}

function finishGame() {
  state.finished = true;
  fans.forEach((fan) => {
    fan.speed = 3;
  });

  state.currentTask = {
    type: "done",
    title: "Free Play Time",
    instructions: "Drag the fans around. The selected fan gets speed buttons above it.",
    prompt: "Now you can move the fans and change their speed."
  };

  updateTaskUi();
  renderFans();
  updateHud();
  setStatus("Every fan is spinning. Hooray.");
  playRoundWin();
}

function completeTask(message) {
  state.stars += 1;
  state.lastFanId = state.currentTask.targetId;
  if (state.currentTask.word) {
    state.lastWord = state.currentTask.word;
  }

  setStatus(message);
  renderStars();

  if (state.stars >= TOTAL_ROUNDS) {
    finishGame();
    return;
  }

  pickNextTask();
  renderFans();
  updateHud();
}

function updateTaskUi() {
  roundPill.textContent = state.finished
    ? `Round ${TOTAL_ROUNDS} / ${TOTAL_ROUNDS}`
    : `Round ${state.round} / ${TOTAL_ROUNDS}`;

  taskTitle.textContent = state.currentTask.title;
  taskInstructions.textContent = state.currentTask.instructions;
  scenePrompt.textContent = state.currentTask.prompt;

  if (state.currentTask.type === "word") {
    clickTarget.classList.add("is-hidden");
    wordCard.classList.remove("is-hidden");
    wordHint.textContent = `Press ${state.currentTask.word[state.wordProgress]} next.`;
  } else if (state.currentTask.type === "click") {
    clickTarget.classList.remove("is-hidden");
    targetColorChip.style.background = targetFan().accent;
    wordCard.classList.add("is-hidden");
    wordHint.textContent = "Wait for the next typing round.";
  } else {
    clickTarget.classList.add("is-hidden");
    wordCard.classList.add("is-hidden");
    wordHint.textContent = "Wait for the next typing round.";
  }

  renderWordTrack();
  renderFans();
  updateHud();
}

function updateHud() {
  const awake = fans.filter((fan) => fan.speed > 0).length;
  const totalSpeed = fans.reduce((sum, fan) => sum + fan.speed, 0);

  starsCount.textContent = `${state.stars} / ${TOTAL_ROUNDS}`;
  awakeCount.textContent = `${awake} / ${fans.length}`;
  breezeLevel.textContent = breezeText(totalSpeed);
  document.body.dataset.breeze = breezeMode(totalSpeed);
}

function renderSizeControl() {
  const preset = SIZE_PRESETS[state.sizeIndex];
  sizeSlider.value = String(state.sizeIndex);
  sizeLabel.textContent = preset.label;
}

function renderStars() {
  starsTrack.innerHTML = "";

  for (let index = 0; index < TOTAL_ROUNDS; index += 1) {
    const dot = document.createElement("span");
    dot.className = "star-dot";
    if (index < state.stars) {
      dot.classList.add("is-earned");
    }
    starsTrack.appendChild(dot);
  }
}

function renderWordTrack() {
  wordTrack.innerHTML = "";

  if (!state.currentTask || state.currentTask.type !== "word") {
    wordTrack.classList.add("is-idle");

    ["-", "-", "-"].forEach((symbol) => {
      const span = document.createElement("span");
      span.className = "word-letter";
      span.textContent = symbol;
      wordTrack.appendChild(span);
    });
    return;
  }

  wordTrack.classList.remove("is-idle");

  [...state.currentTask.word].forEach((letter, index) => {
    const span = document.createElement("span");
    span.className = "word-letter";
    span.textContent = letter;

    if (index < state.wordProgress) {
      span.classList.add("is-done");
    } else if (index === state.wordProgress) {
      span.classList.add("is-next");
    }

    wordTrack.appendChild(span);
  });
}

function renderFans() {
  fanField.innerHTML = "";
  const sizeScale = SIZE_PRESETS[state.sizeIndex].scale;

  fans.forEach((fan) => {
    const button = document.createElement("button");
    button.className = "fan-button";
    button.type = "button";
    button.dataset.fanId = fan.id;
    button.dataset.speed = String(fan.speed);
    button.dataset.x = String(fan.x);
    button.dataset.y = String(fan.y);

    if (state.currentTask && state.currentTask.targetId === fan.id && !state.finished) {
      button.classList.add("is-target");
    }
    if (state.finished && state.selectedFanId === fan.id) {
      button.classList.add("is-selected");
    }

    button.style.left = `${fan.x}%`;
    button.style.top = `${fan.y}%`;
    button.style.width = `${Math.round(fan.size * sizeScale)}px`;
    button.style.height = `${Math.round(fan.size * sizeScale)}px`;
    button.setAttribute("aria-label", `${fan.shortLabel}. ${speedLabel(fan.speed)}.`);

    const shell = document.createElement("span");
    shell.className = "fan-shell";
    shell.innerHTML = fanSvgMarkup(fan);

    const shadow = document.createElement("span");
    shadow.className = "fan-shadow";

    const caption = document.createElement("span");
    caption.className = "fan-caption";
    caption.textContent = fan.shortLabel;

    if (state.currentTask && state.currentTask.type === "click" && state.currentTask.targetId === fan.id) {
      const pointer = document.createElement("span");
      pointer.className = "hand-pointer";
      pointer.textContent = "☝";
      button.appendChild(pointer);
    }

    button.appendChild(shell);
    button.appendChild(shadow);
    button.appendChild(caption);
    fanField.appendChild(button);

    if (state.finished && state.selectedFanId === fan.id) {
      fanField.appendChild(renderSpeedPopover(fan, sizeScale));
    }
  });
}

function renderSpeedPopover(fan, sizeScale) {
  const popover = document.createElement("div");
  popover.className = "fan-speed-popover";
  popover.style.left = `${fan.x}%`;
  popover.style.top = `calc(${fan.y}% - ${Math.round((fan.size * sizeScale) / 2)}px - 18px)`;

  [0, 1, 2, 3].forEach((speed) => {
    const chip = document.createElement("span");
    chip.className = "fan-speed-choice";
    chip.dataset.speedChoice = String(speed);
    chip.textContent = String(speed);
    if (fan.speed === speed) {
      chip.classList.add("is-active");
    }
    popover.appendChild(chip);
  });

  return popover;
}

function chooseClickFan() {
  const candidates = fans.filter((fan) => !fan.special && fan.id !== state.lastFanId && fan.speed < 3);
  const sleeping = candidates.filter((fan) => fan.speed === 0);
  if (sleeping.length) {
    return pickRandom(sleeping);
  }

  const slow = candidates.filter((fan) => fan.speed === 1);
  if (slow.length) {
    return pickRandom(slow);
  }

  return pickRandom(candidates.length ? candidates : fans.filter((fan) => !fan.special));
}

function chooseWordFan() {
  if (state.stars === 2) {
    return fans.find((fan) => fan.id === "hero");
  }

  const candidates = fans.filter((fan) => fan.id !== state.lastFanId && fan.speed < 3);
  return pickRandom(candidates.length ? candidates : fans);
}

function chooseLetters() {
  const choices = LETTER_BANK.filter((letter) => letter !== state.lastWord);
  return pickRandom(choices.length ? choices : LETTER_BANK);
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function targetFan() {
  return fans.find((fan) => fan.id === state.currentTask.targetId);
}

function currentSelectedFan() {
  return fans.find((fan) => fan.id === state.selectedFanId) || fans[0];
}

function selectFan(fanId) {
  state.selectedFanId = fanId;
  renderFans();
  const fan = currentSelectedFan();
  setStatus(`${fan.shortLabel} fan is selected.`);
}

function clickInstructionFor(fan) {
  if (fan.speed === 0) {
    return `Click the ${fan.shortLabel} to wake it up.`;
  }

  return `Click the ${fan.shortLabel} to make it faster.`;
}

function boostFan(fan, amount) {
  fan.speed = Math.min(fan.speed + amount, 3);
  renderFans();
  updateHud();
}

function speedLabel(speed) {
  if (speed === 0) {
    return "sleepy";
  }

  if (speed === 1) {
    return "slow";
  }

  if (speed === 2) {
    return "fast";
  }

  return "turbo";
}

function breezeText(totalSpeed) {
  if (totalSpeed <= 5) {
    return "Quiet room";
  }

  if (totalSpeed <= 9) {
    return "Soft breeze";
  }

  if (totalSpeed <= 13) {
    return "Windy room";
  }

  return "Turbo breeze";
}

function breezeMode(totalSpeed) {
  if (totalSpeed <= 5) {
    return "calm";
  }

  if (totalSpeed <= 9) {
    return "breezy";
  }

  if (totalSpeed <= 13) {
    return "windy";
  }

  return "turbo";
}

function celebrate(element) {
  element.classList.remove("is-celebrating");
  window.requestAnimationFrame(() => {
    element.classList.add("is-celebrating");
  });
  window.setTimeout(() => {
    element.classList.remove("is-celebrating");
  }, 420);
}

function wobble(element) {
  element.classList.remove("is-wrong");
  window.requestAnimationFrame(() => {
    element.classList.add("is-wrong");
  });
  window.setTimeout(() => {
    element.classList.remove("is-wrong");
  }, 320);
}

function setStatus(message) {
  statusText.textContent = message;
}

function renderSoundToggle() {
  soundToggle.textContent = audioState.enabled ? "Sound: On" : "Sound: Off";
}

function handlePointerDown(event) {
  if (!state.finished) {
    return;
  }

  const button = event.target.closest(".fan-button");
  if (!button) {
    return;
  }

  const fan = fans.find((item) => item.id === button.dataset.fanId);
  if (!fan) {
    return;
  }

  const rect = fanField.getBoundingClientRect();
  dragState = {
    fanId: fan.id,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    fieldRect: rect,
    element: button
  };

  button.setPointerCapture(event.pointerId);
  button.addEventListener("pointermove", handlePointerMove);
  button.addEventListener("pointerup", handlePointerUp);
  button.addEventListener("pointercancel", handlePointerUp);
}

function handlePointerMove(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const fan = fans.find((item) => item.id === dragState.fanId);
  if (!fan) {
    return;
  }

  const dx = Math.abs(event.clientX - dragState.startX);
  const dy = Math.abs(event.clientY - dragState.startY);
  if (dx > 6 || dy > 6) {
    dragState.moved = true;
  }

  const xPercent = ((event.clientX - dragState.fieldRect.left) / dragState.fieldRect.width) * 100;
  const yPercent = ((event.clientY - dragState.fieldRect.top) / dragState.fieldRect.height) * 100;

  fan.x = clamp(xPercent, 10, 90);
  fan.y = clamp(yPercent, 15, 84);
  dragState.element.style.left = `${fan.x}%`;
  dragState.element.style.top = `${fan.y}%`;
}

function handlePointerUp(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const button = event.currentTarget;
  button.removeEventListener("pointermove", handlePointerMove);
  button.removeEventListener("pointerup", handlePointerUp);
  button.removeEventListener("pointercancel", handlePointerUp);

  const wasMoved = dragState.moved;
  const fanId = dragState.fanId;
  dragState = null;

  selectFan(fanId);
  if (wasMoved) {
    renderFans();
    setStatus(`${currentSelectedFan().shortLabel} fan moved.`);
    playSoftWhoosh();
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function fanSvgMarkup(fan) {
  const ringStroke = fan.ring === "rgb" ? 'stroke="url(#rgb-ring)"' : `stroke="${fan.accent}"`;
  const stickerStroke = fan.ring === "rgb" ? 'stroke="rgba(255,255,255,0.75)"' : `stroke="${fan.accent}"`;

  return `
    <svg class="fan-svg" viewBox="0 0 100 100" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="rgb-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff8b76"></stop>
          <stop offset="35%" stop-color="#ffe17c"></stop>
          <stop offset="65%" stop-color="#6fe3c3"></stop>
          <stop offset="100%" stop-color="#82c1ff"></stop>
        </linearGradient>
        <radialGradient id="hub-${fan.id}" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#4c5562"></stop>
          <stop offset="100%" stop-color="#1c2026"></stop>
        </radialGradient>
      </defs>

      <rect x="8" y="8" width="84" height="84" rx="11" fill="#20252c"></rect>
      <rect x="13" y="13" width="74" height="74" rx="10" fill="#15191e"></rect>

      <path d="M8 24 L24 8 L30 14 L14 30 Z" fill="#2d343e"></path>
      <path d="M76 8 L92 24 L86 30 L70 14 Z" fill="#2d343e"></path>
      <path d="M8 76 L24 92 L30 86 L14 70 Z" fill="#2d343e"></path>
      <path d="M76 92 L92 76 L86 70 L70 86 Z" fill="#2d343e"></path>

      <circle cx="50" cy="50" r="36.5" fill="none" ${ringStroke} stroke-width="4.2"></circle>
      <circle cx="50" cy="50" r="32.5" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"></circle>
      <circle cx="50" cy="50" r="25.5" fill="rgba(255,244,214,0.22)"></circle>

      <g opacity="0.9">
        <path d="M24 24 L38 38" stroke="#3e4651" stroke-width="3.8" stroke-linecap="round"></path>
        <path d="M76 24 L62 38" stroke="#3e4651" stroke-width="3.8" stroke-linecap="round"></path>
        <path d="M24 76 L38 62" stroke="#3e4651" stroke-width="3.8" stroke-linecap="round"></path>
        <path d="M76 76 L62 62" stroke="#3e4651" stroke-width="3.8" stroke-linecap="round"></path>
      </g>

      <g class="fan-rotor" style="animation-duration: ${spinDuration(fan.speed)}s">
        ${createBladeMarkup(fan)}
        <circle cx="50" cy="50" r="12.2" fill="url(#hub-${fan.id})"></circle>
        <circle cx="50" cy="50" r="7.4" fill="${fan.sticker}" ${stickerStroke} stroke-width="1.3"></circle>
      </g>

      <circle cx="16.5" cy="16.5" r="3.8" fill="#0f1216"></circle>
      <circle cx="83.5" cy="16.5" r="3.8" fill="#0f1216"></circle>
      <circle cx="16.5" cy="83.5" r="3.8" fill="#0f1216"></circle>
      <circle cx="83.5" cy="83.5" r="3.8" fill="#0f1216"></circle>

      <circle cx="16.5" cy="16.5" r="1.3" fill="#54606d"></circle>
      <circle cx="83.5" cy="16.5" r="1.3" fill="#54606d"></circle>
      <circle cx="16.5" cy="83.5" r="1.3" fill="#54606d"></circle>
      <circle cx="83.5" cy="83.5" r="1.3" fill="#54606d"></circle>
    </svg>
  `;
}

function createBladeMarkup(fan) {
  const bladeCount = fan.special ? 7 : 7;
  let markup = "";

  for (let index = 0; index < bladeCount; index += 1) {
    const angle = (360 / bladeCount) * index;
    markup += `
      <g transform="rotate(${angle} 50 50)">
        <path
          d="M50 49 C58 22, 74 20, 77 28 C78 38, 68 46, 55 51 Z"
          fill="#101419"
        ></path>
        <path
          d="M53 48 C60 29, 71 27, 72 32 C72 39, 64 44, 56 46 Z"
          fill="rgba(255,255,255,0.06)"
        ></path>
      </g>
    `;
  }

  return markup;
}

function spinDuration(speed) {
  if (speed === 0) {
    return 0;
  }

  if (speed === 1) {
    return 2.8;
  }

  if (speed === 2) {
    return 1.55;
  }

  return 0.72;
}

function unlockAudio() {
  if (audioState.context) {
    if (audioState.context.state === "suspended") {
      audioState.context.resume();
    }
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    audioState.enabled = false;
    renderSoundToggle();
    return;
  }

  audioState.context = new AudioContextClass();
}

function playTone({ frequency, duration, type = "sine", volume = 0.04, when = 0, endFrequency }) {
  if (!audioState.enabled || !audioState.context) {
    return;
  }

  const startTime = audioState.context.currentTime + when;
  const oscillator = audioState.context.createOscillator();
  const gain = audioState.context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration);
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioState.context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playFanBoost() {
  playTone({ frequency: 220, endFrequency: 120, duration: 0.16, type: "triangle", volume: 0.05 });
  playTone({ frequency: 620, endFrequency: 460, duration: 0.1, type: "sine", volume: 0.025, when: 0.02 });
}

function playSoftWhoosh() {
  playTone({ frequency: 180, endFrequency: 130, duration: 0.1, type: "triangle", volume: 0.02 });
}

function playWrongClick() {
  playTone({ frequency: 190, endFrequency: 150, duration: 0.14, type: "square", volume: 0.025 });
}

function playRightKey() {
  playTone({ frequency: 560, endFrequency: 760, duration: 0.08, type: "triangle", volume: 0.035 });
}

function playWrongKey() {
  playTone({ frequency: 250, endFrequency: 190, duration: 0.12, type: "sawtooth", volume: 0.02 });
}

function playWordWin() {
  playTone({ frequency: 392, duration: 0.12, type: "triangle", volume: 0.035 });
  playTone({ frequency: 494, duration: 0.12, type: "triangle", volume: 0.035, when: 0.08 });
  playTone({ frequency: 659, duration: 0.16, type: "triangle", volume: 0.04, when: 0.16 });
}

function playRoundWin() {
  playTone({ frequency: 392, duration: 0.12, type: "triangle", volume: 0.04 });
  playTone({ frequency: 523, duration: 0.12, type: "triangle", volume: 0.04, when: 0.1 });
  playTone({ frequency: 659, duration: 0.16, type: "triangle", volume: 0.05, when: 0.2 });
  playTone({ frequency: 784, duration: 0.22, type: "triangle", volume: 0.05, when: 0.34 });
}
