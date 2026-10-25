(function () {
  const FA = window.FA;
  const KEY = "fictionarmy-save-v1";

  const defaultSave = () => ({
    unlocked: 0,
    stars: FA.LEVELS.map(() => 0),
    sound: true,
    seenHelp: false,
    secret: false,
  });

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY)) || {};
      return {
        unlocked: clamp(raw.unlocked | 0, 0, FA.LEVELS.length - 1),
        stars: FA.LEVELS.map((_, i) => clamp(((raw.stars || [])[i] | 0), 0, 3)),
        sound: raw.sound !== false,
        seenHelp: !!raw.seenHelp,
        secret: !!raw.secret,
      };
    } catch (error) {
      return defaultSave();
    }
  }

  const save = load();
  const write = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (error) {
      /* partie locale si le navigateur bloque le stockage */
    }
  };

  FA.getSave = () => save;
  FA.markHelpSeen = () => {
    save.seenHelp = true;
    write();
  };
  FA.setSound = (on) => {
    save.sound = on;
    FA.sfx.enabled = on;
    write();
  };
  FA.sfx.enabled = save.sound;

  const app = {
    game: null,
    moonClicks: 0,
    moonTimer: 0,
    show(name) {
      if (name !== "battle" && this.game) {
        this.game.destroy();
        this.game = null;
      }
      if (name !== "studio") FA.studio.leave();
      document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.toggle("active", screen.id === "screen-" + name);
      });
      if (name === "levels") this.renderLevels();
      if (name === "codex") this.renderCodex();
      if (name === "title") this.paintBadge();
      window.scrollTo(0, 0);
    },
    startLevel(index) {
      if (index < 0 || index >= FA.LEVELS.length || index > save.unlocked) {
        this.show("levels");
        return;
      }
      if (this.game) {
        this.game.destroy();
        this.game = null;
      }
      document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.toggle("active", screen.id === "screen-battle");
      });
      this.game = new FA.Game(document.getElementById("battle-root"), index, {
        onExit: () => this.show("levels"),
        onRetry: (i) => this.startLevel(i),
        onWin: (stars) => {
          save.stars[index] = Math.max(save.stars[index] || 0, stars);
          if (index + 1 < FA.LEVELS.length) save.unlocked = Math.max(save.unlocked, index + 1);
          write();
        },
      });
    },
    renderLevels() {
      const grid = document.getElementById("level-grid");
      grid.innerHTML = FA.LEVELS.map((level, index) => {
        const locked = index > save.unlocked;
        const stars = [1, 2, 3].map((n) => '<span class="star' + (n <= save.stars[index] ? " on" : "") + '">★</span>').join("");
        return (
          '<button type="button" class="polaroid' + (locked ? " is-locked" : "") + '" data-level="' + index + '"' + (locked ? " disabled" : "") + ">" +
          '<span class="eyebrow">Nuit ' + level.night + "</span><strong>" + level.name + "</strong>" +
          "<p>" + (locked ? "Encore endormie." : level.summary) + "</p>" +
          '<span class="star-row">' + stars + "</span></button>"
        );
      }).join("");
    },
    renderCodex() {
      const grid = document.getElementById("codex-grid");
      const units = FA.UNIT_ORDER.map((id) => cardUnit(FA.UNITS[id])).join("");
      const enemies = Object.keys(FA.ENEMIES).map((id) => cardEnemy(FA.ENEMIES[id])).join("");
      const levels = FA.LEVELS.map((level) => {
        return (
          '<article class="codex-card"><p class="eyebrow">Nuit ' + level.night + "</p><h3>" + level.name + "</h3><p>" + level.summary + "</p><p>" + level.tip + "</p></article>"
        );
      }).join("");
      grid.innerHTML =
        "<h3>Figurines</h3>" + units +
        "<h3>Intrus</h3>" + enemies +
        "<h3>Nuits</h3>" + levels +
        '<article class="codex-card secret-card"><p class="eyebrow">Clin d\'œil</p><h3>' + FA.SECRET.title + "</h3>" +
        "<p>Sur la chaîne @fictionarmy, une vidéo explique les 3 règles à absolument connaître avant d'acheter une S.H. Figuarts sur Vinted. Les rivales de la nuit 2 n'ont pas écouté.</p>" +
        '<p class="tags">#figurine #histoire #série</p>' +
        '<a class="btn btn-primary" href="' + FA.SECRET.href + '" target="_blank" rel="noopener noreferrer">Voir la vidéo</a></article>';
    },
    paintHero() {
      document.getElementById("hero-shelf").innerHTML =
        FA.figureHTML("knight") + FA.figureHTML("collector") + FA.figureHTML("soldier") + FA.enemyHTML("dust");
    },
    paintBadge() {
      const badge = document.getElementById("secret-badge");
      badge.hidden = !save.secret;
    },
    help() {
      this.modal(
        '<p class="eyebrow">Briefing</p><h3>Comment défendre la chambre</h3><ol>' +
        "<li>Les intrus arrivent par la droite, vers la vitrine des pièces rares.</li>" +
        "<li>Les chevaliers bloquent. Les archers et le soldat articulé tirent de loin.</li>" +
        "<li>Le Collector frappe toute une zone. La caméra fait tomber des likes.</li>" +
        "<li>Clique les cœurs sur le plateau : ce sont eux qui paient l'armée.</li>" +
        "<li>Lance chaque vague avec « Ça tourne ! ». Les pastilles roses disent quels rayons arrivent.</li></ol>" +
        '<button type="button" class="btn btn-primary" data-close="1">Fermer</button>'
      );
    },
    secret() {
      save.secret = true;
      write();
      this.paintBadge();
      FA.sfx.collect();
      this.modal(
        '<p class="eyebrow">Pièce cachée</p><h3>Les 3 règles</h3>' +
        "<p>La lune a gardé une vidéo de la chaîne. Avant d'acheter une S.H. Figuarts sur Vinted, le Commandant y donne 3 règles à absolument connaître.</p>" +
        '<p class="tags">#figurine #histoire #série</p>' +
        '<a class="btn btn-primary" href="' + FA.SECRET.href + '" target="_blank" rel="noopener noreferrer">Regarder sur TikTok</a>'
      );
    },
    modal(html) {
      const modal = document.getElementById("modal");
      document.getElementById("modal-body").innerHTML = html;
      modal.hidden = false;
    },
    closeModal() {
      document.getElementById("modal").hidden = true;
    },
  };

  function cardUnit(unit) {
    return (
      '<article class="codex-card"><div class="mini">' + FA.figureHTML(unit.id) + "</div>" +
      '<p class="eyebrow">' + unit.role + "</p><h3>" + unit.name + "</h3>" +
      "<p>" + unit.lore + "</p><p class=\"meta\">♥ " + unit.cost + " · " + unit.hp + " PV · " + FA.rangeLabel(unit) + "</p></article>"
    );
  }

  function cardEnemy(enemy) {
    return (
      '<article class="codex-card"><div class="mini foe-mini">' + FA.enemyHTML(enemy.id) + "</div>" +
      "<h3>" + enemy.name + "</h3><p>" + enemy.lore + "</p>" +
      '<p class="meta">' + enemy.hp + " PV · " + enemy.reward + " likes</p></article>"
    );
  }

  document.body.addEventListener("click", (event) => {
    FA.sfx.unlock();
    const go = event.target.closest("[data-go]");
    if (go) app.show(go.dataset.go);
    const level = event.target.closest("[data-level]");
    if (level && !level.disabled) app.startLevel(Number(level.dataset.level));
    if (event.target.closest("[data-help]")) app.help();
    if (event.target.closest("[data-close]")) app.closeModal();
    if (event.target.closest("[data-unlock]")) {
      save.unlocked = FA.LEVELS.length - 1;
      write();
      app.renderLevels();
      app.show("levels");
    }
  });

  document.getElementById("moon").addEventListener("click", () => {
    app.moonClicks += 1;
    clearTimeout(app.moonTimer);
    app.moonTimer = setTimeout(() => {
      app.moonClicks = 0;
    }, 4000);
    if (app.moonClicks >= 3) {
      app.moonClicks = 0;
      app.secret();
    }
  });

  document.getElementById("modal").addEventListener("click", (event) => {
    if (event.target.id === "modal") app.closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") app.closeModal();
  });

  FA.studio = new FA.Studio(document.getElementById("screen-studio"));
  app.paintHero();
  app.paintBadge();
  app.show("title");
})();
