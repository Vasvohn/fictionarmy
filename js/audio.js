(function () {
  const FA = (window.FA = window.FA || {});

  const sfx = {
    ctx: null,
    enabled: true,
    unlock() {
      if (!this.enabled) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!this.ctx) this.ctx = new Ctx();
      if (this.ctx.state === "suspended") this.ctx.resume();
    },
    tone(freq, dur, type, vol, slide) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || "triangle";
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    ui() {
      this.unlock();
      this.tone(520, 0.06, "square", 0.03);
    },
    place() {
      this.unlock();
      this.tone(196, 0.09, "triangle", 0.06);
      this.tone(330, 0.12, "square", 0.025);
    },
    collect() {
      this.unlock();
      this.tone(660, 0.08, "triangle", 0.05);
      setTimeout(() => this.tone(880, 0.1, "triangle", 0.04), 70);
    },
    shoot() {
      this.unlock();
      this.tone(740, 0.04, "square", 0.015, 200);
    },
    hit() {
      this.unlock();
      this.tone(140, 0.06, "sawtooth", 0.02, -40);
    },
    defeat() {
      this.unlock();
      this.tone(220, 0.08, "triangle", 0.04, -80);
    },
    break() {
      this.unlock();
      this.tone(110, 0.16, "sawtooth", 0.04, -70);
    },
    leak() {
      this.unlock();
      this.tone(90, 0.22, "square", 0.05, -30);
    },
    wave() {
      this.unlock();
      this.tone(180, 0.08, "square", 0.04);
      setTimeout(() => this.tone(90, 0.12, "triangle", 0.05), 90);
    },
    clear() {
      this.unlock();
      this.tone(523, 0.1, "triangle", 0.04);
      setTimeout(() => this.tone(659, 0.12, "triangle", 0.04), 90);
    },
    clap() {
      this.unlock();
      this.tone(140, 0.05, "square", 0.05);
      this.tone(420, 0.07, "sawtooth", 0.02);
    },
    win() {
      this.unlock();
      [523, 659, 784, 1046].forEach((freq, i) => {
        setTimeout(() => this.tone(freq, 0.16, "triangle", 0.05), i * 120);
      });
    },
    lose() {
      this.unlock();
      [392, 349, 311, 196].forEach((freq, i) => {
        setTimeout(() => this.tone(freq, 0.18, "triangle", 0.04), i * 140);
      });
    },
  };

  FA.sfx = sfx;
})();
