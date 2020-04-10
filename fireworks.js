
class Morph {
  constructor() {
    this.parent = null;
    this.x = 0;
    this.y = 0;
    this.w = 20;
    this.h = 20;
    this.color = "red";
  }
  update(deltaTime) {}
  draw(ctx, canvas, deltaTime) {
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
	}
}

class World extends Morph {
  constructor(canvas) {
    super();

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.running = false;
    this.children = [];

    this.makeFullscreen(canvas);
    this.start();
  }
  makeFullscreen(canvas) {
    let self = this; // FUCKING Javascript
    function resize() {
      self.w = window.innerWidth;
      self.h = window.innerHeight;
      canvas.width = self.w;
      canvas.height = self.h;
    }
    resize();
    $(window).resize(resize);
  }
  addChild(morph) {
    morph.parent = this;
    this.children.push(morph);
  }
  removeChild(morph) {
    let index = this.children.indexOf(morph);
    if (index < 0) return;
    this.children.splice(index, 1);
    morph.parent = null;
  }
  start() {
    if (this.running) return;
    this.running = true;
    let self = this; // FUCKING javascript

    let last = 0;
    function loop() {
      let now = +new Date();
      let delta = (now - last) / 1000;
      if (delta > 0.01) {
        self.fullUpdate(delta);
        self.fullDraw(self.ctx, self.canvas, delta);
        last = now;
      }
      if (self.running) {
        requestAnimationFrame(loop);
      }
    }
    loop();
  }
  stop() {
    this.running = false;
  }
  fullUpdate(deltaTime) {
    this.children.forEach(each => {
      each.update(deltaTime);
    });
  }
  fullDraw(deltaTime) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.children.forEach(each => {
      let x = each.x;
      let y = each.y;
      this.ctx.translate(x, y);
      each.draw(this.ctx, this.canvas, this.deltaTime);
      this.ctx.translate(-x, -y);
    });
  }
}


class FireworksParticle extends Morph {
  static burst(world, point, amount, minMagnitude, maxMagnitude) {
    amount = amount || 2000;
    minMagnitude = minMagnitude || 50;
    maxMagnitude = maxMagnitude || 300;

    let colors = ["red", "yellow", "green", "blue"];
    let color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < amount; i++) {
      let angle = Math.random() * 350;
      let magnitude = Math.random() * (maxMagnitude - minMagnitude) + minMagnitude;
      let o = Math.sin(angle) * magnitude;
      let a = Math.cos(angle) * magnitude;
      let particle = new FireworksParticle(point.x, point.y, {x: a, y: o});
      particle.color = color;
      world.addChild(particle);
    }
  }

	constructor(x, y, speed) {
    super();
    this.speed = speed;
    this.x = x;
    this.y = y;
    this.w = 4;
    this.h = 4;
    this.deltaAlpha = -0.92;
    this.alpha = 1;
    this.color = "#FF0000";
	}
  draw(ctx, canvas, deltaTime) {
    let oldAlpha = ctx.globalAlpha;
		ctx.globalAlpha = this.alpha;

    super.draw(ctx, canvas, deltaTime);

		ctx.globalAlpha = oldAlpha;
  }
  update(deltaTime) {
    this.x += this.speed.x * deltaTime;
    this.y += this.speed.y * deltaTime;
    this.alpha += this.deltaAlpha * deltaTime;
    if (this.alpha <= 0) {
      this.parent.removeChild(this);
    }
  }
}

let fireworksTimer = null;

function stopFireworks() {
  if (fireworksTimer == null) return;
  clearInterval(fireworksTimer);
}

function startFireworks() {
  if (fireworksTimer != null) return;

  let canvas = document.getElementById("fireworks-world");
  let world = new World(canvas);

  fireworksTimer = setInterval(function () {
    if (Math.random() < 0.3) {
      let x = Math.random() * canvas.width;
      let y = Math.random() * canvas.height/2;
      let amount = Math.random() * 500 + 250;
      let min = 0;
      let max = Math.random() * 500 + 200;
      FireworksParticle.burst(world, {x: x, y: y}, amount, min, max);
    }
  }, 200);
}
