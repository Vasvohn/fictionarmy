(function () {
  const FA = (window.FA = window.FA || {});
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const SETS = [
    { id: "etagere", name: "Étagère" },
    { id: "bureau", name: "Bureau" },
    { id: "commode", name: "Commode" },
    { id: "carton", name: "Fort carton" },
  ];
  const POSES = [
    { id: "idle", name: "Garde" },
    { id: "strike", name: "Attaque" },
    { id: "victory", name: "Victoire" },
    { id: "sneak", name: "Approche" },
  ];

  class Studio {
    constructor(root) {
      this.root = root;
      this.figures = [];
      this.fx = { dust: false, hearts: false, laser: false, flash: false };
      this.selected = null;
      this.drag = null;
      this.busy = false;
      this.cancel = false;
      this.uid = 1;
      this.videoBlob = null;
      this.videoUrl = "";
      this.diorama = root.querySelector("#diorama");
      this.figureLayer = root.querySelector("#diorama-figures");
      this.fxLayer = root.querySelector("#diorama-fx");
      this.countdown = root.querySelector("#countdown");
      this.statusEl = root.querySelector("#studio-status");
      this.output = root.querySelector("#studio-output");
      this.caption = root.querySelector("#caption");
      this.canvas = root.querySelector("#record-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.setLabel = root.querySelector("#set-label");
      root.addEventListener("click", (event) => this.onClick(event));
      this.figureLayer.addEventListener("pointerdown", (event) => this.onDown(event));
      window.addEventListener("pointermove", (event) => this.onMove(event));
      window.addEventListener("pointerup", () => {
        this.drag = null;
      });
      root.querySelector("#photo-input").addEventListener("change", (event) => this.onPhoto(event));
      document.addEventListener("keydown", (event) => this.onKey(event));
      this.status("Place tes figurines, choisis une pose, puis tourne la prise.");
    }

    enter() {
      this.cancel = false;
      this.drawFrame(0, 32);
    }

    leave() {
      this.cancel = true;
      this.countdown.hidden = true;
      this.busy = false;
    }

    onClick(event) {
      const set = event.target.closest("[data-set]");
      if (set) {
        this.diorama.dataset.set = set.dataset.set;
        this.setLabel.textContent = SETS.find((item) => item.id === set.dataset.set).name;
        this.root.querySelectorAll("[data-set]").forEach((btn) => {
          btn.classList.toggle("is-on", btn === set);
        });
        return;
      }
      const add = event.target.closest("[data-add]");
      if (add) {
        this.addFigure(add.dataset.add);
        return;
      }
      const pose = event.target.closest("[data-pose]");
      if (pose) {
        this.setPose(pose.dataset.pose);
        return;
      }
      const fx = event.target.closest("[data-fx]");
      if (fx) {
        const key = fx.dataset.fx;
        this.fx[key] = !this.fx[key];
        fx.classList.toggle("is-on", this.fx[key]);
        this.renderFx();
        return;
      }
      const act = event.target.closest("[data-studio]")?.dataset.studio;
      if (act === "flip") this.flip();
      if (act === "delete") this.removeSelected();
      if (act === "multiply") this.toggleMultiply();
      if (act === "shoot") this.shoot();
      if (act === "poster") this.poster();
      if (act === "share") this.share();
    }

    onKey(event) {
      if (!this.root.classList.contains("active")) return;
      if (event.target.matches("input, textarea")) return;
      const fig = this.figures.find((item) => item.uid === this.selected);
      if (!fig) return;
      const step = event.shiftKey ? 0.04 : 0.012;
      let used = false;
      if (event.key === "ArrowLeft") { fig.x = clamp(fig.x - step); used = true; }
      if (event.key === "ArrowRight") { fig.x = clamp(fig.x + step); used = true; }
      if (event.key === "ArrowUp") { fig.y = clamp(fig.y - step, 0.2, 0.96); used = true; }
      if (event.key === "ArrowDown") { fig.y = clamp(fig.y + step, 0.2, 0.96); used = true; }
      if (event.key === "Delete" || event.key === "Backspace") {
        this.removeSelected();
        used = true;
      }
      if (used) event.preventDefault();
      this.positionFigures();
    }

    onPhoto(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      if (!file) return;
      if (this.figures.length >= 8) {
        this.status("Huit figurines maximum sur le plateau.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => this.addFigure("photo", image);
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    addFigure(type, image) {
      if (this.busy) return;
      if (this.figures.length >= 8) {
        this.status("Huit figurines maximum sur le plateau.");
        return;
      }
      const spot = this.figures.length;
      const fig = {
        uid: this.uid++,
        type,
        image: image || null,
        x: 0.28 + (spot % 4) * 0.15,
        y: spot < 4 ? 0.78 : 0.58,
        pose: "idle",
        facing: 1,
        multiply: false,
      };
      this.figures.push(fig);
      this.selected = fig.uid;
      this.renderFigures();
      FA.sfx.place();
    }

    renderFigures() {
      this.figureLayer.innerHTML = "";
      for (const fig of this.figures) {
        const el = document.createElement("div");
        el.className = "placed" + (fig.type === "photo" ? " is-photo" : "");
        el.dataset.uid = String(fig.uid);
        if (fig.type === "photo") {
          const img = document.createElement("img");
          img.alt = "Figurine importée";
          img.src = fig.image.src;
          el.appendChild(img);
        } else el.innerHTML = FA.figureHTML(fig.type);
        fig.el = el;
        this.figureLayer.appendChild(el);
      }
      this.positionFigures();
    }

    positionFigures() {
      for (const fig of this.figures) {
        if (!fig.el) continue;
        fig.el.style.left = fig.x * 100 + "%";
        fig.el.style.top = fig.y * 100 + "%";
        fig.el.dataset.pose = fig.pose;
        fig.el.dataset.facing = fig.facing < 0 ? "left" : "right";
        fig.el.classList.toggle("is-selected", fig.uid === this.selected);
        fig.el.classList.toggle("is-multiply", !!fig.multiply);
      }
    }

    renderFx() {
      this.fxLayer.innerHTML = "";
      if (this.fx.hearts) {
        for (let i = 0; i < 8; i += 1) {
          const heart = document.createElement("i");
          heart.className = "fx-heart";
          heart.textContent = "♥";
          heart.style.left = 8 + i * 11 + "%";
          heart.style.animationDelay = i * 0.18 + "s";
          this.fxLayer.appendChild(heart);
        }
      }
      if (this.fx.dust) {
        for (let i = 0; i < 10; i += 1) {
          const bit = document.createElement("i");
          bit.className = "fx-dust";
          bit.style.left = 6 + i * 9 + "%";
          bit.style.animationDelay = i * 0.12 + "s";
          this.fxLayer.appendChild(bit);
        }
      }
      if (this.fx.laser) {
        const beam = document.createElement("i");
        beam.className = "fx-laser";
        this.fxLayer.appendChild(beam);
      }
    }

    selectedFigure() {
      return this.figures.find((item) => item.uid === this.selected) || null;
    }

    setPose(pose) {
      const fig = this.selectedFigure();
      if (!fig) {
        this.status("Choisis d'abord une figurine sur le plateau.");
        return;
      }
      fig.pose = pose;
      this.positionFigures();
    }

    flip() {
      const fig = this.selectedFigure();
      if (!fig) return;
      fig.facing *= -1;
      this.positionFigures();
    }

    toggleMultiply() {
      const fig = this.selectedFigure();
      if (!fig || fig.type !== "photo") {
        this.status("Le fond clair sert aux photos détourées sur fond blanc.");
        return;
      }
      fig.multiply = !fig.multiply;
      this.positionFigures();
    }

    removeSelected() {
      const fig = this.selectedFigure();
      if (!fig || this.busy) return;
      this.figures = this.figures.filter((item) => item !== fig);
      this.selected = this.figures.length ? this.figures[this.figures.length - 1].uid : null;
      this.renderFigures();
    }

    onDown(event) {
      const el = event.target.closest(".placed");
      if (!el || this.busy) {
        this.selected = null;
        this.positionFigures();
        return;
      }
      this.selected = Number(el.dataset.uid);
      this.positionFigures();
      const fig = this.selectedFigure();
      const rect = this.diorama.getBoundingClientRect();
      this.drag = {
        uid: fig.uid,
        dx: event.clientX - rect.left - fig.x * rect.width,
        dy: event.clientY - rect.top - fig.y * rect.height,
      };
      el.setPointerCapture(event.pointerId);
    }

    onMove(event) {
      if (!this.drag) return;
      const fig = this.figures.find((item) => item.uid === this.drag.uid);
      if (!fig) return;
      const rect = this.diorama.getBoundingClientRect();
      fig.x = clamp((event.clientX - rect.left - this.drag.dx) / rect.width);
      fig.y = clamp((event.clientY - rect.top - this.drag.dy) / rect.height, 0.2, 0.96);
      this.positionFigures();
    }

    async shoot() {
      if (this.busy) return;
      this.busy = true;
      this.cancel = false;
      const originals = this.figures.map((fig) => ({
        uid: fig.uid,
        x: fig.x,
        y: fig.y,
        pose: fig.pose,
      }));
      try {
        for (const n of [3, 2, 1]) {
          if (this.cancel) throw new Error("cancel");
          this.countdown.hidden = false;
          this.countdown.textContent = String(n);
          FA.sfx.ui();
          await wait(650);
        }
        this.countdown.textContent = "ACTION";
        FA.sfx.clap();
        await wait(420);
        this.countdown.hidden = true;
        await this.record(originals);
        this.status("Prise terminée. Tu peux la revoir, la télécharger ou la partager.");
      } catch (error) {
        if (error && error.message !== "cancel") {
          this.makePoster();
          this.status("La vidéo n'a pas pu partir. Une affiche a été créée à la place.");
        }
      } finally {
        this.restore(originals);
        this.countdown.hidden = true;
        this.busy = false;
      }
    }

    restore(originals) {
      for (const saved of originals) {
        const fig = this.figures.find((item) => item.uid === saved.uid);
        if (!fig) continue;
        fig.x = saved.x;
        fig.y = saved.y;
        fig.pose = saved.pose;
      }
      this.positionFigures();
    }

    async record(originals) {
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
        .find((type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("recorder");
      const stream = this.canvas.captureStream(8);
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise((resolve) => {
        rec.onstop = resolve;
      });
      rec.start(120);
      const frames = 32;
      for (let i = 0; i < frames; i += 1) {
        if (this.cancel) break;
        this.applyFrame(originals, i, frames);
        this.drawFrame(i, frames);
        await wait(125);
      }
      if (rec.state !== "inactive") rec.stop();
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
      if (this.cancel) return;
      const blob = new Blob(chunks, { type: mime });
      if (blob.size < 800) throw new Error("empty");
      this.videoBlob = blob;
      if (this.videoUrl) URL.revokeObjectURL(this.videoUrl);
      this.videoUrl = URL.createObjectURL(blob);
      const ext = mime.includes("mp4") ? "mp4" : "webm";
      this.output.innerHTML =
        '<video controls playsinline src="' + this.videoUrl + '"></video>' +
        '<div class="panel-actions"><a class="btn btn-primary" download="fictionarmy-prise.' + ext + '" href="' + this.videoUrl + '">Télécharger la vidéo</a>' +
        '<button type="button" class="btn btn-ghost" data-studio="share">Partager</button></div>';
      FA.sfx.win();
    }

    applyFrame(originals, frame) {
      for (const saved of originals) {
        const fig = this.figures.find((item) => item.uid === saved.uid);
        if (!fig) continue;
        const step = frame % 4 < 2 ? 0 : -0.012;
        fig.y = saved.y + step;
        if (frame < 8) fig.pose = "idle";
        else if (frame < 18) {
          fig.pose = "strike";
          fig.x = clamp(saved.x + (frame - 8) * 0.004);
        } else {
          fig.pose = saved.pose === "idle" ? "victory" : saved.pose;
          fig.x = saved.x;
        }
      }
      this.positionFigures();
    }

    poster() {
      if (this.busy) return;
      const originals = this.figures.map((fig) => ({ uid: fig.uid, x: fig.x, y: fig.y, pose: fig.pose }));
      this.drawFrame(20, 32);
      this.canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "fictionarmy-affiche.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        this.status("Affiche téléchargée.");
        FA.sfx.ui();
      }, "image/png");
      this.restore(originals);
    }

    makePoster() {
      this.drawFrame(24, 32);
      this.canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        this.output.innerHTML =
          '<img alt="Affiche de la prise" src="' + url + '">' +
          '<div class="panel-actions"><a class="btn btn-primary" download="fictionarmy-affiche.png" href="' + url + '">Télécharger l\'affiche</a></div>';
      }, "image/png");
    }

    async share() {
      const caption = this.caption.value.trim();
      if (this.videoBlob && navigator.canShare) {
        const file = new File([this.videoBlob], "fictionarmy-prise.webm", { type: this.videoBlob.type });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "FictionArmy",
              text: caption,
            });
            return;
          } catch (error) {
            if (error && error.name === "AbortError") return;
          }
        }
      }
      try {
        await navigator.clipboard.writeText(caption);
        this.status("Légende copiée. Télécharge la vidéo pour la joindre à ta publication.");
      } catch (error) {
        this.status("Télécharge la vidéo, puis colle la légende dans ton application.");
      }
    }

    drawFrame(frame, total) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const set = this.diorama.dataset.set;
      ctx.clearRect(0, 0, w, h);
      paintSet(ctx, w, h, set);
      if (this.fx.dust) {
        ctx.fillStyle = "rgba(255,244,220,0.35)";
        for (let i = 0; i < 16; i += 1) {
          const x = (i * 67 + frame * 7) % w;
          const y = (i * 41 + (frame % 2) * 6) % (h - 40);
          ctx.beginPath();
          ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (this.fx.laser) {
        ctx.strokeStyle = "rgba(255,70,90,0.85)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(80, h * 0.62 + (frame % 2) * 4);
        ctx.lineTo(w - 80, h * 0.48);
        ctx.stroke();
      }
      const bob = frame % 2 ? -8 : 0;
      for (const fig of this.figures) paintFigure(ctx, fig, w, h, bob);
      if (this.fx.hearts) {
        ctx.fillStyle = "#ff3d6e";
        for (let i = 0; i < 7; i += 1) {
          const x = 70 + i * 120 + (frame % 2) * 6;
          const y = 70 + ((frame + i) % 5) * 18;
          heart(ctx, x, y, 10);
        }
      }
      if (this.fx.flash && frame % 8 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillRect(0, 0, w, h);
      }
      filmBorder(ctx, w, h);
      ctx.fillStyle = "#1c1424";
      ctx.fillRect(0, h - 58, w, 58);
      ctx.fillStyle = "#fff4e4";
      ctx.font = "700 22px Nunito, Segoe UI, sans-serif";
      const caption = (this.caption.value || "FictionArmy").slice(0, 78);
      ctx.fillText(caption, 24, h - 24);
      ctx.font = "800 16px Nunito, Segoe UI, sans-serif";
      ctx.fillText("FICTIONARMY  " + String(frame + 1).padStart(2, "0") + "/" + total, 24, 36);
    }

    status(text) {
      this.statusEl.textContent = text;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min == null ? 0.06 : min, Math.min(max == null ? 0.94 : max, value));
  }

  function paintSet(ctx, w, h, set) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    if (set === "bureau") {
      sky.addColorStop(0, "#182033");
      sky.addColorStop(1, "#1f6b4a");
    } else if (set === "commode") {
      sky.addColorStop(0, "#4a3044");
      sky.addColorStop(1, "#e7d3b1");
    } else if (set === "carton") {
      sky.addColorStop(0, "#6b4a32");
      sky.addColorStop(1, "#c4956a");
    } else {
      sky.addColorStop(0, "#241845");
      sky.addColorStop(1, "#6a3b28");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    if (set === "etagere") {
      ctx.fillStyle = "#f4e2b0";
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.2, 36, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, h * 0.72, w, 18);
  }

  function paintFigure(ctx, fig, w, h, bob) {
    const x = fig.x * w;
    const y = fig.y * h + bob;
    ctx.save();
    ctx.translate(x, y);
    if (fig.facing < 0) ctx.scale(-1, 1);
    if (fig.pose === "strike") ctx.rotate(-0.12);
    if (fig.pose === "sneak") ctx.scale(1, 0.86);
    if (fig.type === "photo" && fig.image) {
      const iw = 90;
      const ih = 120;
      ctx.drawImage(fig.image, -iw / 2, -ih, iw, ih);
      ctx.restore();
      return;
    }
    const unit = FA.UNITS[fig.type] || { color: "#888", color2: "#fff" };
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, -6, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = unit.color;
    roundRect(ctx, -16, -58, 12, 28, 4);
    roundRect(ctx, 4, -58, 12, 28, 4);
    ctx.fillStyle = unit.color2;
    roundRect(ctx, -22, -92, 44, 40, 8);
    ctx.fillStyle = "#f2c7a5";
    roundRect(ctx, -16, -122, 32, 28, 8);
    ctx.fillStyle = "#1c1424";
    ctx.fillRect(-8, -112, 5, 5);
    ctx.fillRect(4, -112, 5, 5);
    if (fig.pose === "victory") {
      ctx.strokeStyle = unit.color2;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-10, -80);
      ctx.lineTo(-28, -110);
      ctx.moveTo(10, -80);
      ctx.lineTo(28, -110);
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function heart(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s * 0.3);
    ctx.bezierCurveTo(x - s, y + s * 0.75, x, y + s * 1.05, x, y + s * 1.15);
    ctx.bezierCurveTo(x, y + s * 1.05, x + s, y + s * 0.75, x + s, y + s * 0.3);
    ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.3);
    ctx.fill();
  }

  function filmBorder(ctx, w, h) {
    ctx.fillStyle = "#120e18";
    ctx.fillRect(0, 0, 22, h);
    ctx.fillRect(w - 22, 0, 22, h);
    ctx.fillStyle = "#efe6d6";
    for (let y = 16; y < h - 40; y += 28) {
      ctx.beginPath();
      ctx.arc(11, y, 5, 0, Math.PI * 2);
      ctx.arc(w - 11, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  FA.Studio = Studio;
  FA.STUDIO_SETS = SETS;
  FA.STUDIO_POSES = POSES;
})();
