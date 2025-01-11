// global variables
let scoreEl = document.getElementById("score");
let score = 0;
let active = false;
let paused = false;
let speedFactor = 1;
const gameContainer = document.getElementById("gameBody");
let height = gameContainer.clientHeight;
let infoEl = document.getElementById("info");

//classes
class Car {
  /**
   *
   * @param {HTMLElement} el
   * @param {number} l1
   * @param {number} l2
   * @param {boolean} cur
   */
  constructor(el, l1 = 20, l2 = 110, cur = false) {
    this.el = el;
    this.cur = cur;
    this.l1 = l1;
    this.l2 = l2;
    el.style.left = this.cur ? l1 + "px" : l2 + "px";
    this.left = this.cur ? l1 : l2;
  }

  mov() {
    if (!active || paused) return;
    if (
      this.animate &&
      this.animate.currentTime < this.animate.effect.getTiming().duration - 80
    ) {
      return;
    }
    this.cur = !this.cur;
    this.left = this.cur ? this.l1 : this.l2;
    this.animate = this.el.animate([{ left: this.left + "px" }], {
      duration: 200,
      fill: "forwards",
    });
  }

  addListener(key1) {
    window.addEventListener("keydown", (e) => {
      if (e.key == key1) {
        this.mov();
      }
    });
  }

  reset() {
    this.el.style.left = this.cur ? this.l1 + "px" : this.l2 + "px";
    this.left = this.cur ? this.l1 : this.l2;
    this.animate?.finish();
  }
}

class Tracks {
  /**
   *
   * @param {HTMLElement} track1
   * @param {HTMLElement} track2
   * @param {Car} car
   */
  constructor(track1, track2, car) {
    this.track1 = track1;
    this.track2 = track2;
    this.car = car;
    this.t1Objects = new Set();
    this.t2Objects = new Set();
    this.baseTimeout = 2000;
    this.lastAddObjectTime = Date.now();
    this.remainingTimeout = null;
    this.lastPauseTime = null;
  }

  updateSpeedFactor() {
    const speedIncrease = Math.floor(score / 10) * 0.02;
    speedFactor = Math.max(0.1, 1 / (1 + speedIncrease));
  }

  getCurrentTimeout() {
    const currentTimeout = this.baseTimeout * speedFactor;
    const randomVariation = random() * 800 * speedFactor;
    return currentTimeout + randomVariation;
  }

  start() {
    this.lastAddObjectTime = Date.now();
    this.addObject();
  }

  stop() {
    active = false;
    clearTimeout(this.timeout);

    this.t1Objects.forEach((obj) => {
      obj.animation?.pause();
    });
    this.t2Objects.forEach((obj) => {
      obj.animation?.pause();
    });
  }

  pause() {
    if (!active) return;
    paused = true;
    this.lastPauseTime = Date.now();

    // Calculate remaining timeout when pausing
    if (this.timeout) {
      this.remainingTimeout =
        this.getCurrentTimeout() - (Date.now() - this.lastAddObjectTime);
      clearTimeout(this.timeout);
    }

    this.t1Objects.forEach((obj) => {
      obj.pause();
    });
    this.t2Objects.forEach((obj) => {
      obj.pause();
    });
  }

  resume() {
    if (!active) return;
    paused = false;

    this.t1Objects.forEach((obj) => {
      obj.resume();
    });
    this.t2Objects.forEach((obj) => {
      obj.resume();
    });

    // If we've been paused longer than the remaining timeout, add object immediately
    const pauseDuration = Date.now() - this.lastPauseTime;
    if (
      this.remainingTimeout === null ||
      pauseDuration > this.remainingTimeout
    ) {
      this.addObject();
    } else {
      // Otherwise, wait for the remaining time
      this.timeout = setTimeout(() => this.addObject(), this.remainingTimeout);
    }
  }

  addObject() {
    this.lastAddObjectTime = Date.now();
    this.remainingTimeout = null;

    this.updateSpeedFactor();
    if (!active || paused) return;

    let whichTrack = random() > 0.5 ? true : false;
    if (whichTrack) {
      let whichObj = random() > 0.5 ? true : false;
      let objel = document.createElement("div");
      let obj = whichObj
        ? new Stone(objel, this.car, 20)
        : new Coin(objel, this.car, 20);
      this.t1Objects.add(obj);
      this.track1.appendChild(objel);
    } else {
      let whichObj = random() > 0.5 ? true : false;
      let objel = document.createElement("div");
      let obj = whichObj
        ? new Stone(objel, this.car, 110)
        : new Coin(objel, this.car, 110);
      this.t2Objects.add(obj);
      this.track2.appendChild(objel);
    }

    const nextTimeout = this.getCurrentTimeout();
    this.timeout = setTimeout(() => this.addObject(), nextTimeout);
  }

  removePassedObjs() {
    this.t1Objects.forEach((obj) => {
      if (obj.el.offsetTop > height) {
        this.t1Objects.delete(obj);
        obj.el.remove();
      }
    });
    this.t2Objects.forEach((obj) => {
      if (obj.el.offsetTop > height) {
        this.t2Objects.delete(obj);
        obj.el.remove();
      }
    });
  }
}

class Obj {
  /**
   *
   * @param {HTMLElement} el
   * @param {Car} car
   * @param {number} left
   */
  constructor(el, car, left) {
    this.el = el;
    this.car = car;
    this.el.top = this.top + "px";
    this.width = 50;
    this.left = left;
    this.baseDuration = 7500;
    this.carHeight = car.el.offsetHeight;
  }

  mov() {
    if (!active || paused) return;
    const currentDuration = this.baseDuration * speedFactor;

    this.animation = this.el.animate([{ top: height + "px" }], {
      easing: "linear",
      duration: currentDuration,
      fill: "forwards",
    });
  }

  pause() {
    this.animation?.pause();
  }

  resume() {
    this.checkInterval = setInterval(() => {
      if (!active || paused) return clearInterval(this.checkInterval);
      this.checkCollide();
    }, 10);
    this.animation?.play();
  }

  isColliding() {
    const carBottom = height - 20;
    const objHeight = this.el.offsetHeight;
    const carCollisionZoneStart = carBottom - this.carHeight - objHeight;
    const carCollisionZoneEnd = carBottom;

    return (
      this.el.offsetTop > carCollisionZoneStart &&
      this.el.offsetTop < carCollisionZoneEnd &&
      this.car.el.offsetLeft > this.left - 50 &&
      this.car.el.offsetLeft < this.left + 50
    );
  }
}

class Stone extends Obj {
  constructor(el, car, left) {
    super(el, car, left);
    this.el.id = "stone";
    this.mov();

    this.checkInterval = setInterval(() => {
      if (!active || paused) return clearInterval(this.checkInterval);
      this.checkCollide();
    }, 10);
  }

  checkCollide() {
    if (this.isColliding()) {
      active = false;
      globalStop();
      this.el.animate([{ scale: 0.9 }], {
        direction: "alternate",
        duration: 500,
        iterations: Infinity,
      });
      return true;
    }
  }
}

class Coin extends Obj {
  constructor(el, car, left) {
    super(el, car, left);
    this.el.id = "coin";
    this.mov();

    this.interval = setInterval(() => {
      if (!active || paused) {
        clearInterval(this.interval);
      }
      this.checkCollide();
    }, 10);
  }

  checkCollide() {
    // collect coin
    if (this.isColliding()) {
      this.el.remove();
      scoreEl.innerText = ++score;
      clearInterval(this.interval);
      return true;
    }

    // if coin passes, game end
    if (this.el.offsetTop > height - 18) {
      this.el.animate(
        [{ scale: 1.1, border: "5px solid red", boxSizing: "border-box" }],
        {
          direction: "alternate",
          duration: 500,
          iterations: Infinity,
        }
      );
      globalStop();
    }
  }
}

// implementation
let llTrack = document.getElementById("llTrack");
let lrTrack = document.getElementById("lrTrack");
let rlTrack = document.getElementById("rlTrack");
let rrTrack = document.getElementById("rrTrack");

let car1 = new Car(document.getElementById("car1"), 20, 110, true);
let car2 = new Car(document.getElementById("car2"), 20, 110, true);
car1.addListener("a");
car1.addListener("A");
car1.addListener("ArrowLeft");
car2.addListener("d");
car2.addListener("D");
car2.addListener("ArrowRight");
let lTracks, rTracks;

function globalStop() {
  lTracks?.stop();
  rTracks?.stop();
  car1.animate?.pause();
  car2.animate?.pause();
  infoEl.style.display = "block";
}

function start() {
  score = 0;
  speedFactor = 1;
  globalStop();
  infoEl.style.display = "none";
  active = true;
  car1.reset();
  car2.reset();
  lTracks = new Tracks(llTrack, lrTrack, car1);
  rTracks = new Tracks(rlTrack, rrTrack, car2);
  llTrack.innerHTML = "";
  lrTrack.innerHTML = "";
  rlTrack.innerHTML = "";
  rrTrack.innerHTML = "";
  scoreEl.innerText = 0;

  lTracks.start();
  rTracks.start();
}

function random() {
  let v = crypto.getRandomValues(new Uint8Array(1));
  return v[0] / 256;
}

window.onkeydown = (e) => {
  if (e.key == "r" || e.key == "R") {
    start();
  } else if (e.key == "p" || e.key == "P") {
    if (!paused && active) {
      lTracks?.pause();
      rTracks?.pause();
    } else if (paused && active) {
      lTracks?.resume();
      rTracks?.resume();
    }
  }
};

window.addEventListener("resize", () => {
  height = gameContainer.clientHeight;
});

// Eventlisteners for mobile support
gameContainer.addEventListener("click", (event) => {
  const containerCenter = gameContainer.offsetWidth / 2;
  const clickX = event.clientX - gameContainer.getBoundingClientRect().left;
  if (clickX < containerCenter) {
    car1.mov();
  } else {
    car2.mov();
  }
  event.preventDefault();
});

gameContainer.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    Array.from(event.touches).forEach(touch => {
      const containerCenter = gameContainer.offsetWidth / 2;
      const touchX = touch.clientX - gameContainer.getBoundingClientRect().left;
      if (touchX < containerCenter) {
        car1.mov();
      } else {
        car2.mov();
      }
    });
  },
  { passive: false }
);