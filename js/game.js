(function () {
  const FA = (window.FA = window.FA || {});
  const CONTACT = 6.2;
  const SLOT = 5.5;

  function colX(col) {
    return ((col + 0.5) / FA.COLS) * 100;
  }

function rowTop(row) {
  return ((row + 0.82) / FA.ROWS) * 100 + "%";
}

  class Game {
    constructor(root, levelIndex, hooks) {
      this.root = root;
      this.levelIndex = levelIndex;
      this.level = FA.LEVELS[levelIndex];
      this.hooks = hooks;
      this.units = [];
      this.enemies = [];
      this.projectiles = [];
      this.hearts = [];
      this.nodes = new Map();
      this.uid = 1;
      this.likes = this.level.startLikes;
      this.lives = this.level.lives;
      this.maxLives = this.level.lives;
      this.waveIndex = 0;
      this.waveTime = 0;
      this.queue = [];
      this.phase = "ready";
      this.selected = null;
      this.inspectId = null;
      this.speed = 1;
      this.paused = false;
      this.dead = false;
      this.heartTimer = 2.2;
      this.last = performance.now();
      this.onClick = (event) => this.handleClick(event);
      this.onKey = (event) => this.handleKey(event);
      this.loop = (time) => this.frame(time);
      this.mount();
      this.spawnHeart(colX(4), 2, 25);
      this.syncHud();
      this.highlight();
      document.addEventListener("keydown", this.onKey);
      const save = FA.getSave ? FA.getSave() : { seenHelp: true };
      if (!save.seenHelp) this.showHelp(false);
      else this.toast(this.level.tip, 7000);
      this.raf = requestAnimationFrame(this.loop);
    }

    mount() {
      const level = this.level;
      this.root.innerHTML =
        '<div class="battle">' +
        '<header class="hud">' +
        '<button type="button" class="btn btn-ghost" data-act="exit">← Nuits</button>' +
        '<div class="hud-title"><p class="eyebrow">Nuit ' + level.night + '</p><h2>' + level.name + "</h2></div>" +
        '<div class="hud-stats">' +
        '<div class="stat stat-likes"><span class="ico" aria-hidden="true">♥</span><strong id="likes-num">0</strong><span>likes</span></div>' +
        '<div class="stat stat-lives" id="lives-stat" title="Pièces rares"></div>' +
        '<div class="stat" id="wave-stat"></div>' +
        '<button type="button" class="btn btn-ghost" data-act="speed">×1</button>' +
        '<button type="button" class="btn btn-ghost" data-act="pause">Pause</button>' +
        '<button type="button" class="btn btn-ghost" data-act="sound">Son</button>' +
        "</div></header>" +
        '<div class="battle-stage"><p class="sr" id="live" aria-live="polite"></p>' +
        '<div class="board theme-' + level.theme + '" id="board">' +
        '<aside class="vitrine" id="vitrine"><p>Vitrine</p><div class="pieces" id="pieces"></div></aside>' +
        '<div class="playfield" id="playfield"><div class="lanes" id="lanes"></div><div class="actors" id="actors"></div><div class="fx" id="fx"></div></div>' +
        '<p class="door-label">Ils arrivent ici</p></div>' +
        '<p class="status-line" id="status-line"></p>' +
        '<p class="toast" id="toast" hidden></p></div>' +
        '<footer class="dock">' +
        '<button type="button" class="btn btn-action" data-act="wave">Ça tourne !</button>' +
        '<div class="cards" id="cards"></div>' +
        '<div class="preview-wrap"><span>Menace</span><div id="preview"></div></div>' +
        "</footer>" +
        '<div class="inspector" id="inspector" hidden></div>' +
        '<div class="overlay" id="overlay" hidden></div></div>';

      this.layers = {
        actors: this.root.querySelector("#actors"),
        fx: this.root.querySelector("#fx"),
      };
      this.likesEl = this.root.querySelector("#likes-num");
      this.livesEl = this.root.querySelector("#lives-stat");
      this.waveEl = this.root.querySelector("#wave-stat");
      this.statusEl = this.root.querySelector("#status-line");
      this.toastEl = this.root.querySelector("#toast");
      this.liveEl = this.root.querySelector("#live");
      this.cardsEl = this.root.querySelector("#cards");
      this.previewEl = this.root.querySelector("#preview");
      this.inspector = this.root.querySelector("#inspector");
      this.overlay = this.root.querySelector("#overlay");
      this.vitrine = this.root.querySelector("#vitrine");
      this.board = this.root.querySelector("#board");
      this.btnWave = this.root.querySelector('[data-act="wave"]');
      this.btnSpeed = this.root.querySelector('[data-act="speed"]');
      this.btnSound = this.root.querySelector('[data-act="sound"]');

      const lanes = this.root.querySelector("#lanes");
      for (let row = 0; row < FA.ROWS; row += 1) {
        const lane = document.createElement("div");
        lane.className = "lane";
        for (let col = 0; col < FA.COLS; col += 1) {
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "cell";
          cell.dataset.row = String(row);
          cell.dataset.col = String(col);
          cell.setAttribute("aria-label", "Case rangée " + (row + 1) + ", colonne " + (col + 1));
          lane.appendChild(cell);
        }
        lanes.appendChild(lane);
      }

      this.statusEl.textContent = "Choisis une figurine, puis une case. Touches 1 à 6.";
      this.cardsEl.innerHTML = FA.UNIT_ORDER.map((id, index) => {
        const unit = FA.UNITS[id];
        return (
          '<button type="button" class="card" data-unit="' + id + '">' +
          '<span class="key">' + (index + 1) + "</span>" +
          '<span class="mini">' + FA.figureHTML(id) + "</span>" +
          "<strong>" + unit.name + "</strong>" +
          '<em>' + unit.role + "</em>" +
          '<span class="cost">♥ ' + unit.cost + "</span></button>"
        );
      }).join("");

      this.root.addEventListener("click", this.onClick);
      this.root.addEventListener("pointerover", (event) => {
        const cell = event.target.closest(".cell");
        if (!cell || cell.querySelector(".ghost")) return;
        this.showGhost(cell);
      });
      this.root.addEventListener("pointerout", (event) => {
        const cell = event.target.closest(".cell");
        if (!cell || (event.relatedTarget && cell.contains(event.relatedTarget))) return;
        this.clearGhost(cell);
      });
      this.renderLives();
    }

    destroy() {
      this.dead = true;
      cancelAnimationFrame(this.raf);
      clearTimeout(this.toastTimer);
      document.removeEventListener("keydown", this.onKey);
      this.root.replaceChildren();
    }

    frame(time) {
      if (this.dead) return;
      const dt = Math.min(0.05, (time - this.last) / 1000);
      this.last = time;
      if (!this.paused && this.phase !== "won" && this.phase !== "lost") this.update(dt * this.speed);
      this.render();
      this.raf = requestAnimationFrame(this.loop);
    }

    update(dt) {
      if (this.phase === "wave") {
        this.waveTime += dt;
        while (this.queue.length && this.queue[0].time <= this.waveTime) {
          const spawn = this.queue.shift();
          this.spawnEnemy(spawn.type, spawn.row);
        }
      }

      this.updateEnemies(dt);
      this.updateUnits(dt);
      this.updateProjectiles(dt);
      this.enemies = this.enemies.filter((enemy) => enemy.hp > 0 && !enemy.leaked);

      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.heartTimer = 5.2;
        if (this.hearts.length < 4) {
          const row = Math.floor(Math.random() * FA.ROWS);
          const col = Math.floor(Math.random() * FA.COLS);
          this.spawnHeart(colX(col), row, 25);
        }
      }
      for (const heart of [...this.hearts]) {
        heart.life -= dt;
        if (heart.life < 2.4) heart.el.classList.add("is-fading");
        if (heart.life <= 0) this.removeHeart(heart);
      }

      if (this.phase === "wave" && this.queue.length === 0 && this.enemies.length === 0 && this.waveTime > 0.4) {
        this.onWaveCleared();
      }

      if (this.inspectId) {
        const unit = this.units.find((item) => item.id === this.inspectId);
        const hp = this.inspector.querySelector("[data-hp]");
        if (!unit) this.closeInspector();
        else if (hp) hp.textContent = Math.ceil(unit.hp) + " / " + unit.maxHp;
      }
    }

    updateEnemies(dt) {
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        enemy.attackCd -= dt;
        if (enemy.attacking > 0) enemy.attacking -= dt;
        if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
        const unit = this.unitInFront(enemy);
        let next = enemy.x - enemy.speed * dt;
        if (unit) next = Math.max(next, unit.x + CONTACT);
        if (next < -4) {
          enemy.leaked = true;
          continue;
        }
        enemy.x = next;
      }

      for (const enemy of this.enemies) {
        if (!enemy.leaked) continue;
        this.onLeak(enemy);
      }
      this.enemies = this.enemies.filter((enemy) => !enemy.leaked);

      this.enemies.sort((a, b) => a.row - b.row || a.x - b.x);
      let prev = null;
      for (const enemy of this.enemies) {
        if (prev && prev.row === enemy.row && enemy.x < prev.x + SLOT) enemy.x = prev.x + SLOT;
        const unit = this.unitInFront(enemy);
        enemy.blocked = !!(unit && enemy.x <= unit.x + CONTACT + 0.9);
        prev = enemy;
      }

      for (const enemy of this.enemies) {
        if (!enemy.blocked || enemy.attackCd > 0 || enemy.hp <= 0) continue;
        const unit = this.unitInFront(enemy);
        if (!unit || enemy.x - unit.x > CONTACT + 1.4) continue;
        this.damageUnit(unit, enemy.damage);
        enemy.attackCd = enemy.attackEvery;
        enemy.attacking = 0.26;
        FA.sfx.hit();
      }
    }

    updateUnits(dt) {
      for (const unit of [...this.units]) {
        if (unit.hp <= 0) continue;
        if (unit.attacking > 0) unit.attacking -= dt;
        if (unit.hitFlash > 0) unit.hitFlash -= dt;
        unit.cooldown -= dt;
        if (unit.cooldown > 0) continue;
        const def = FA.UNITS[unit.type];
        if (def.spawnsLike) {
          this.spawnHeart(Math.min(94, unit.x + 4), unit.row, def.spawnsLike);
          unit.cooldown = def.cooldown;
          unit.attacking = 0.3;
          continue;
        }
        if (def.aoe) {
          const hits = this.aoeTargets(unit, def.range);
          if (!hits.length) continue;
          const damage = FA.damageOf(unit.type, unit.level);
          hits.forEach((enemy) => this.damageEnemy(enemy, damage));
          unit.cooldown = def.cooldown;
          unit.attacking = 0.34;
          this.burst(unit);
          FA.sfx.shoot();
          continue;
        }
        if (def.range < 3) {
          const target = this.meleeTarget(unit, def.range);
          if (!target) continue;
          this.damageEnemy(target, FA.damageOf(unit.type, unit.level));
          unit.cooldown = def.cooldown;
          unit.attacking = 0.24;
          continue;
        }
        const target = this.rangedTarget(unit, def.range);
        if (!target) continue;
        this.projectiles.push({
          id: ++this.uid,
          x: unit.x + 2,
          row: unit.row,
          targetId: target.id,
          dmg: FA.damageOf(unit.type, unit.level),
          kind: unit.type,
        });
        unit.cooldown = def.cooldown;
        unit.attacking = 0.2;
        FA.sfx.shoot();
      }
    }

    updateProjectiles(dt) {
      for (const shot of this.projectiles) {
        const target = this.enemies.find((enemy) => enemy.id === shot.targetId && enemy.hp > 0);
        if (!target) {
          shot.dead = true;
          continue;
        }
        const dir = Math.sign(target.x - shot.x) || 1;
        shot.x += dir * 80 * dt;
        if ((dir > 0 && shot.x >= target.x) || (dir < 0 && shot.x <= target.x) || Math.abs(target.x - shot.x) < 1.8) {
          this.damageEnemy(target, shot.dmg);
          shot.dead = true;
        }
      }
      this.projectiles = this.projectiles.filter((shot) => !shot.dead);
    }

    unitInFront(enemy) {
      let best = null;
      for (const unit of this.units) {
        if (unit.row !== enemy.row || unit.hp <= 0) continue;
        if (unit.x <= enemy.x + 1.8 && (!best || unit.x > best.x)) best = unit;
      }
      return best;
    }

    meleeTarget(unit, rangeCols) {
      const reach = rangeCols * (100 / FA.COLS);
      let best = null;
      for (const enemy of this.enemies) {
        if (enemy.row !== unit.row || enemy.hp <= 0) continue;
        const dx = enemy.x - unit.x;
        if (dx < -2 || dx > reach) continue;
        if (!best || enemy.x < best.x) best = enemy;
      }
      return best;
    }

    rangedTarget(unit, rangeCols) {
      const reach = rangeCols * (100 / FA.COLS);
      let best = null;
      let bestDx = Infinity;
      for (const enemy of this.enemies) {
        if (enemy.row !== unit.row || enemy.hp <= 0) continue;
        const dx = enemy.x - unit.x;
        if (dx < -1 || dx > reach) continue;
        if (dx < bestDx) {
          best = enemy;
          bestDx = dx;
        }
      }
      return best;
    }

    aoeTargets(unit, rangeCols) {
      const hits = [];
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        const dx = (enemy.x - unit.x) / (100 / FA.COLS);
        const dy = enemy.row - unit.row;
        if (Math.hypot(dx, dy) <= rangeCols) hits.push(enemy);
      }
      return hits;
    }

    spawnEnemy(type, row) {
      const def = FA.ENEMIES[type];
      this.enemies.push({
        id: ++this.uid,
        type,
        row,
        x: 107,
        hp: def.hp,
        maxHp: def.hp,
        speed: def.speed * (0.96 + Math.random() * 0.08),
        damage: def.damage,
        attackEvery: def.attackEvery,
        reward: def.reward,
        attackCd: 0.45,
        attacking: 0,
        hitFlash: 0,
        leaked: false,
      });
    }

    damageEnemy(enemy, amount) {
      if (!enemy || enemy.hp <= 0) return;
      enemy.hp -= amount;
      enemy.hitFlash = 0.12;
      this.floatText(enemy.x, enemy.row, String(amount), "dmg");
      if (enemy.hp <= 0) {
        enemy.hp = 0;
        this.likes += enemy.reward;
        this.floatText(enemy.x, enemy.row - 0.25, "+" + enemy.reward, "like");
        this.bumpLikes();
        FA.sfx.defeat();
        this.syncHud();
      }
    }

    damageUnit(unit, amount) {
      unit.hp -= amount;
      unit.hitFlash = 0.14;
      if (unit.hp <= 0) {
        this.floatText(unit.x, unit.row, "KO", "dmg");
        this.removeUnit(unit);
        this.paintCells();
        FA.sfx.break();
      }
    }

    onLeak(enemy) {
      const loss = FA.ENEMIES[enemy.type].leak || 1;
      this.lives = Math.max(0, this.lives - loss);
      this.renderLives();
      this.vitrine.classList.remove("shake");
      void this.vitrine.offsetWidth;
      this.vitrine.classList.add("shake");
      this.floatText(4, enemy.row, loss > 1 ? "Volées !" : "Volée !", "dmg");
      FA.sfx.leak();
      this.say(loss > 1 ? "Le Vieux Carton emporte deux pièces rares." : "Une pièce rare a été volée.");
      if (this.lives <= 0) this.lose();
      else if (this.lives === 1) this.toast("Dernière pièce rare !");
    }

    startWave() {
      if (this.paused || this.phase === "wave" || this.phase === "won" || this.phase === "lost") return;
      if (this.waveIndex >= this.level.waves.length) return;
      this.phase = "wave";
      this.waveTime = 0;
      this.queue = this.level.waves[this.waveIndex].map((spawn) => ({ ...spawn }));
      this.board.classList.add("is-live");
      this.syncHud();
      this.highlight();
      this.toast("Ça tourne !");
      this.say("Vague " + (this.waveIndex + 1) + ".");
      FA.sfx.wave();
    }

    onWaveCleared() {
      if (this.phase !== "wave") return;
      this.waveIndex += 1;
      this.likes += 15;
      this.bumpLikes();
      if (this.waveIndex >= this.level.waves.length) {
        this.win();
        return;
      }
      this.phase = "between";
      this.board.classList.remove("is-live");
      this.toast("Plan réussi. +15 likes.");
      this.say("Rayon dégagé.");
      FA.sfx.clear();
      this.syncHud();
      this.highlight();
    }

    win() {
      if (this.phase === "won" || this.phase === "lost") return;
      this.phase = "won";
      this.board.classList.remove("is-live");
      const lost = this.maxLives - this.lives;
      const stars = lost === 0 ? 3 : lost <= 2 ? 2 : 1;
      if (this.hooks.onWin) this.hooks.onWin(stars);
      const lines = [
        "Victoire de justesse.",
        "Quelques frayeurs, mais la collection tient.",
        "La collection tient.",
        "Aucune pièce volée.",
      ];
      const last = this.levelIndex >= FA.LEVELS.length - 1;
      this.showEnd({
        title: "La vitrine est sauve",
        text: this.level.win + " " + lines[stars],
        stars,
        next: !last,
      });
      FA.sfx.win();
      this.syncHud();
    }

    lose() {
      if (this.phase === "lost" || this.phase === "won") return;
      this.phase = "lost";
      this.board.classList.remove("is-live");
      this.showEnd({
        title: "La vitrine est vide",
        text: "Les pièces rares ont quitté l'étagère. Une autre nuit, Commandant.",
        stars: 0,
        next: false,
      });
      FA.sfx.lose();
      this.syncHud();
    }

    showEnd(info) {
      this.closeInspector();
      const stars = [1, 2, 3].map((n) => '<span class="star' + (n <= info.stars ? " on" : "") + '">★</span>').join("");
      const next = info.next ? '<button type="button" class="btn btn-primary" data-act="next">Nuit suivante</button>' : "";
      this.overlay.hidden = false;
      this.overlay.innerHTML =
        '<div class="panel endcard"><p class="eyebrow">FictionArmy</p><h3>' + info.title + "</h3><p>" + info.text + "</p>" +
        '<p class="star-row" aria-label="' + info.stars + ' étoiles">' + stars + "</p>" +
        '<div class="panel-actions">' +
        '<button type="button" class="btn btn-action" data-act="retry">Rejouer la nuit</button>' + next +
        '<button type="button" class="btn btn-ghost" data-act="levels">Toutes les nuits</button></div></div>';
    }

    showHelp(fromPause) {
      this.paused = true;
      this.closeInspector();
      const back = fromPause ? "pause" : "";
      this.overlay.hidden = false;
      this.overlay.innerHTML =
        '<div class="panel help-card"><p class="eyebrow">Briefing</p><h3>Comment défendre la chambre</h3><ol>' +
        "<li>Les intrus arrivent par la droite et marchent vers la vitrine.</li>" +
        "<li>Place un chevalier face à eux. Le guerrier, juste derrière, frappe plus fort.</li>" +
        "<li>L'archer et le soldat articulé tirent depuis la gauche, sur tout leur rayon.</li>" +
        "<li>Clique les cœurs pour gagner des likes. La caméra en fait apparaître.</li>" +
        "<li>Le Collector est une édition limitée : son attaque touche autour de lui.</li>" +
        "<li>« Ça tourne ! » lance la vague. Les cases roses annoncent les rayons menacés.</li>" +
        "<li>Un intrus qui traverse vole une pièce rare. À zéro, la nuit est perdue.</li></ol>" +
        "<p>Touches : 1 à 6 choisissent une figurine, Échap annule, Espace lance la vague.</p>" +
        '<button type="button" class="btn btn-primary" data-act="close-help" data-back="' + back + '">' +
        (fromPause ? "Retour" : "C'est compris") + "</button></div>";
    }

    showPause() {
      this.paused = true;
      this.closeInspector();
      this.overlay.hidden = false;
      this.overlay.innerHTML =
        '<div class="panel"><p class="eyebrow">Pause</p><h3>Le plateau attend</h3><p>Les figurines gardent la pose.</p>' +
        '<div class="panel-actions">' +
        '<button type="button" class="btn btn-primary" data-act="resume">Reprendre</button>' +
        '<button type="button" class="btn btn-ghost" data-act="help-pause">Comment jouer</button>' +
        '<button type="button" class="btn btn-ghost" data-act="exit">Quitter la nuit</button></div></div>';
    }

    handleClick(event) {
      const heart = event.target.closest(".heart-pickup");
      if (heart) {
        this.collectHeart(Number(heart.dataset.id));
        return;
      }
      const act = event.target.closest("[data-act]")?.dataset.act;
      if (act) {
        this.onAct(act, event);
        return;
      }
      const card = event.target.closest("[data-unit]");
      if (card) {
        this.select(card.dataset.unit);
        return;
      }
      const cell = event.target.closest(".cell");
      if (cell) this.onCell(Number(cell.dataset.row), Number(cell.dataset.col));
    }

    onAct(act, event) {
      if (act === "wave") this.startWave();
      if (act === "upgrade") this.upgrade();
      if (act === "sell") this.sell();
      if (act === "pause") this.showPause();
      if (act === "resume") {
        this.paused = false;
        this.overlay.hidden = true;
      }
      if (act === "help-pause") this.showHelp(true);
      if (act === "close-help") {
        const back = event.target.closest("[data-back]")?.dataset.back;
        if (back === "pause") this.showPause();
        else {
          if (FA.markHelpSeen) FA.markHelpSeen();
          this.paused = false;
          this.overlay.hidden = true;
          this.toast(this.level.tip, 7000);
        }
      }
      if (act === "speed") {
        this.speed = this.speed === 1 ? 2 : 1;
        this.btnSpeed.textContent = "×" + this.speed;
      }
      if (act === "sound") {
        if (FA.setSound) FA.setSound(!FA.sfx.enabled);
        else FA.sfx.enabled = !FA.sfx.enabled;
        this.btnSound.textContent = FA.sfx.enabled ? "Son" : "Muet";
        FA.sfx.ui();
      }
      if (act === "exit" || act === "levels") this.hooks.onExit();
      if (act === "retry") this.hooks.onRetry(this.levelIndex);
      if (act === "next") this.hooks.onRetry(this.levelIndex + 1);
      if (act === "close-inspector") this.closeInspector();
    }

    handleKey(event) {
      if (this.dead) return;
      if (event.target.matches("input, textarea")) return;
      if (this.paused && event.key !== "Escape") return;
      if (event.key >= "1" && event.key <= "6") {
        const id = FA.UNIT_ORDER[Number(event.key) - 1];
        if (id) this.select(this.selected === id ? null : id);
      }
      if (event.key === "Escape") {
        if (!this.inspector.hidden) this.closeInspector();
        else if (this.selected) this.select(null);
        else if (this.paused && this.phase !== "won" && this.phase !== "lost") this.onAct("resume");
        else if (this.phase !== "won" && this.phase !== "lost") this.showPause();
      }
      if (event.code === "Space" && !event.target.closest("button")) {
        event.preventDefault();
        this.startWave();
      }
    }

    select(id) {
      if (this.phase === "won" || this.phase === "lost") return;
      this.selected = id;
      this.root.querySelectorAll(".card").forEach((card) => {
        card.classList.toggle("is-selected", card.dataset.unit === id);
      });
      this.clearGhosts();
      if (!id) this.statusEl.textContent = "Choisis une figurine, puis une case. Touches 1 à 6.";
      else this.statusEl.textContent = FA.UNITS[id].name + " · " + FA.UNITS[id].blurb;
    }

    onCell(row, col) {
      if (this.paused || this.phase === "won" || this.phase === "lost") return;
      const unit = this.unitAt(row, col);
      if (unit) {
        this.openInspector(unit);
        return;
      }
      if (this.selected) this.place(row, col);
    }

    place(row, col) {
      const def = FA.UNITS[this.selected];
      if (!def) return;
      if (this.likes < def.cost) {
        this.toast("Pas assez de likes. Récolte les cœurs.");
        const card = this.root.querySelector('[data-unit="' + def.id + '"]');
        if (card) {
          card.classList.remove("shake");
          void card.offsetWidth;
          card.classList.add("shake");
        }
        return;
      }
      this.likes -= def.cost;
      this.clearGhosts();
      this.units.push({
        id: ++this.uid,
        type: def.id,
        row,
        col,
        x: colX(col),
        hp: def.hp,
        maxHp: def.hp,
        level: 1,
        spent: def.cost,
        cooldown: 0.35,
        attacking: 0,
        hitFlash: 0,
      });
      this.paintCells();
      this.bumpLikes();
      this.syncHud();
      FA.sfx.place();
    }

    unitAt(row, col) {
      return this.units.find((unit) => unit.row === row && unit.col === col && unit.hp > 0);
    }

    removeUnit(unit) {
      this.units = this.units.filter((item) => item !== unit);
      if (this.inspectId === unit.id) this.closeInspector();
      const el = this.nodes.get("u" + unit.id);
      if (el) el.remove();
      this.nodes.delete("u" + unit.id);
    }

    openInspector(unit) {
      const cost = FA.upgradeCost(unit.level);
      const refund = Math.floor(unit.spent * 0.5);
      const upgrade = cost == null
        ? "<p>Niveau maximum.</p>"
        : '<button type="button" class="btn btn-primary" data-act="upgrade">Améliorer · ' + cost + " ♥</button>";
      this.inspectId = unit.id;
      this.inspector.hidden = false;
      this.inspector.innerHTML =
        "<header><strong>" + FA.UNITS[unit.type].name + "</strong><button type=\"button\" data-act=\"close-inspector\" aria-label=\"Fermer\">×</button></header>" +
        "<p>" + "★".repeat(unit.level) + " · " + FA.rangeLabel(FA.UNITS[unit.type]) + "</p>" +
        '<p>Points de vie <b data-hp>' + Math.ceil(unit.hp) + " / " + unit.maxHp + "</b></p>" +
        (FA.UNITS[unit.type].damage ? "<p>Dégâts " + FA.damageOf(unit.type, unit.level) + "</p>" : "<p>Produit des likes.</p>") +
        '<div class="panel-actions">' + upgrade +
        '<button type="button" class="btn btn-ghost" data-act="sell">Revendre · ' + refund + " ♥</button></div>";
      const el = this.nodes.get("u" + unit.id);
      if (!el) return;
      const battle = this.root.querySelector(".battle").getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left - battle.left, battle.width - 240));
      let top = rect.bottom - battle.top + 8;
      if (rect.bottom + 180 > battle.bottom) top = Math.max(8, rect.top - battle.top - 170);
      this.inspector.style.left = left + "px";
      this.inspector.style.top = top + "px";
    }

    closeInspector() {
      this.inspectId = null;
      this.inspector.hidden = true;
    }

    upgrade() {
      const unit = this.units.find((item) => item.id === this.inspectId);
      if (!unit) return;
      const cost = FA.upgradeCost(unit.level);
      if (cost == null) return;
      if (this.likes < cost) {
        this.toast("Pas assez de likes.");
        return;
      }
      this.likes -= cost;
      unit.spent += cost;
      const nextHp = FA.hpOf(unit.type, unit.level + 1);
      unit.hp += nextHp - unit.maxHp;
      unit.maxHp = nextHp;
      unit.level += 1;
      this.bumpLikes();
      this.syncHud();
      this.openInspector(unit);
      FA.sfx.place();
    }

    sell() {
      const unit = this.units.find((item) => item.id === this.inspectId);
      if (!unit) return;
      const refund = Math.floor(unit.spent * 0.5);
      this.likes += refund;
      this.removeUnit(unit);
      this.paintCells();
      this.bumpLikes();
      this.syncHud();
      this.toast("Revendu. +" + refund + " likes.");
      FA.sfx.ui();
    }

    spawnHeart(x, row, value) {
      if (this.hearts.length >= 6) return;
      const heart = { id: ++this.uid, x, row, value, life: 9 };
      const el = document.createElement("button");
      el.type = "button";
      el.className = "heart-pickup";
      el.dataset.id = String(heart.id);
      el.style.left = x + "%";
      el.style.top = ((row + 0.42) / FA.ROWS) * 100 + "%";
      el.innerHTML = "<span>♥</span><small>" + value + "</small>";
      el.setAttribute("aria-label", "Récolter " + value + " likes");
      this.layers.fx.appendChild(el);
      heart.el = el;
      this.hearts.push(heart);
    }

    collectHeart(id) {
      const heart = this.hearts.find((item) => item.id === id);
      if (!heart) return;
      this.likes += heart.value;
      this.floatText(heart.x, heart.row, "+" + heart.value, "like");
      this.removeHeart(heart);
      this.bumpLikes();
      this.syncHud();
      FA.sfx.collect();
    }

    removeHeart(heart) {
      heart.el.remove();
      this.hearts = this.hearts.filter((item) => item !== heart);
    }

    burst(unit) {
      const el = document.createElement("i");
      el.className = "aoe-ring";
      el.style.left = unit.x + "%";
      el.style.top = rowTop(unit.row);
      this.layers.fx.appendChild(el);
      setTimeout(() => el.remove(), 500);
    }

    floatText(x, row, text, kind) {
      const el = document.createElement("span");
      el.className = "floater " + kind;
      el.textContent = text;
      el.style.left = x + "%";
      el.style.top = ((Math.max(0, row) + 0.34) / FA.ROWS) * 100 + "%";
      this.layers.fx.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }

    paintCells() {
      this.root.querySelectorAll(".cell").forEach((cell) => {
        const unit = this.unitAt(Number(cell.dataset.row), Number(cell.dataset.col));
        cell.classList.toggle("is-full", !!unit);
      });
    }

    showGhost(cell) {
      this.clearGhost(cell);
      if (!this.selected || this.paused) return;
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      if (this.unitAt(row, col)) return;
      const ghost = document.createElement("span");
      ghost.className = "ghost" + (this.likes < FA.UNITS[this.selected].cost ? " is-poor" : "");
      ghost.innerHTML = FA.figureHTML(this.selected);
      cell.appendChild(ghost);
    }

    clearGhost(cell) {
      cell.querySelectorAll(".ghost").forEach((ghost) => ghost.remove());
    }

    clearGhosts() {
      this.root.querySelectorAll(".ghost").forEach((ghost) => ghost.remove());
    }

    highlight() {
      const wave = this.level.waves[Math.min(this.waveIndex, this.level.waves.length - 1)];
      const rows = new Set((this.waveIndex >= this.level.waves.length ? [] : wave).map((spawn) => spawn.row));
      if (this.waveIndex >= this.level.waves.length) rows.clear();
      this.root.querySelectorAll(".lane").forEach((lane, index) => lane.classList.toggle("is-hot", rows.has(index)));
      this.previewEl.innerHTML = [0, 1, 2, 3, 4]
        .map((index) => '<i class="pip' + (rows.has(index) ? " on" : "") + '"></i>')
        .join("");
    }

    renderLives() {
      this.livesEl.innerHTML = Array.from({ length: this.maxLives }, (_, index) => {
        return '<i class="gem' + (index < this.lives ? "" : " is-gone") + '"></i>';
      }).join("");
    }

    bumpLikes() {
      this.likesEl.classList.remove("bump");
      void this.likesEl.offsetWidth;
      this.likesEl.classList.add("bump");
    }

    syncHud() {
      this.likesEl.textContent = String(this.likes);
      const shown = Math.min(this.waveIndex + 1, this.level.waves.length);
      this.waveEl.textContent = "Vague " + shown + "/" + this.level.waves.length;
      this.btnWave.disabled = this.phase === "wave" || this.phase === "won" || this.phase === "lost";
      this.btnWave.textContent = this.phase === "wave" ? "Ça tourne…" : "Ça tourne !";
      this.btnSound.textContent = FA.sfx.enabled ? "Son" : "Muet";
      this.root.querySelectorAll(".card").forEach((card) => {
        const unit = FA.UNITS[card.dataset.unit];
        card.classList.toggle("is-broke", this.likes < unit.cost);
        card.classList.toggle("is-selected", this.selected === unit.id);
      });
    }

    say(text) {
      this.liveEl.textContent = text;
    }

    toast(text, ms) {
      this.toastEl.hidden = false;
      this.toastEl.textContent = text;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastEl.hidden = true;
      }, ms || 2600);
    }

    render() {
      const alive = new Set();
      for (const unit of this.units) {
        if (unit.hp <= 0) continue;
        alive.add(this.drawActor("u" + unit.id, unit, FA.figureHTML(unit.type)));
      }
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        alive.add(this.drawActor("e" + enemy.id, enemy, FA.enemyHTML(enemy.type)));
      }
      for (const shot of this.projectiles) alive.add(this.drawProjectile(shot));
      for (const [key, el] of this.nodes) {
        if (alive.has(key)) continue;
        el.remove();
        this.nodes.delete(key);
      }
    }

    drawActor(key, ent, html) {
      let el = this.nodes.get(key);
      if (!el) {
        el = document.createElement("div");
        el.className = "actor";
        el.innerHTML = '<div class="hp"><span></span></div><b class="stars-pips"></b>' + html;
        this.layers.actors.appendChild(el);
        this.nodes.set(key, el);
      }
      el.style.left = ent.x + "%";
      el.style.top = rowTop(ent.row);
      el.style.zIndex = String(10 + Math.round(ent.row) * 3);
      const ratio = Math.max(0, ent.hp / ent.maxHp);
      el.querySelector(".hp span").style.transform = "scaleX(" + ratio + ")";
      el.classList.toggle("is-hit", ent.hitFlash > 0);
      el.classList.toggle("is-attacking", ent.attacking > 0);
      el.classList.toggle("is-low", ratio > 0 && ratio < 0.4);
      const stars = el.querySelector(".stars-pips");
      const label = ent.level > 1 ? "★".repeat(ent.level - 1) : "";
      if (stars.textContent !== label) stars.textContent = label;
      return key;
    }

    drawProjectile(shot) {
      const key = "p" + shot.id;
      let el = this.nodes.get(key);
      if (!el) {
        el = document.createElement("i");
        el.className = "projectile " + shot.kind;
        this.layers.actors.appendChild(el);
        this.nodes.set(key, el);
      }
      el.style.left = shot.x + "%";
      el.style.top = ((shot.row + 0.5) / FA.ROWS) * 100 + "%";
      return key;
    }
  }

  FA.Game = Game;
})();
