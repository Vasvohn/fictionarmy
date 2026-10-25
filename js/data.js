(function () {
  const FA = (window.FA = window.FA || {});

  const w = (...items) => items.map(([time, type, row]) => ({ time, type, row }));

  FA.ROWS = 5;
  FA.COLS = 9;
  FA.UNIT_ORDER = ["knight", "warrior", "archer", "soldier", "collector", "camera"];

  FA.UNITS = {
    knight: {
      id: "knight",
      name: "Chevalier",
      role: "Corps à corps",
      blurb: "Encaisse les coups et bloque le rayon.",
      lore: "Premier gardien de l'étagère. Il ne recule pas, même quand la poussière lui monte aux genoux.",
      cost: 50,
      hp: 280,
      damage: 16,
      range: 1.25,
      cooldown: 0.82,
      color: "#3558d6",
      color2: "#9eb4ff",
    },
    warrior: {
      id: "warrior",
      name: "Guerrier",
      role: "Corps à corps",
      blurb: "Frappe fort. Place-le juste derrière un chevalier.",
      lore: "Il a appris ses poses en regardant les vidéos de la chaîne, image par image.",
      cost: 75,
      hp: 150,
      damage: 30,
      range: 2.05,
      cooldown: 0.68,
      color: "#c4622d",
      color2: "#f0a36a",
    },
    archer: {
      id: "archer",
      name: "Archer",
      role: "Tireur",
      blurb: "Tire loin sur son rayon, depuis l'arrière.",
      lore: "Chaque flèche est une prise ratée puis réussie. Le stop-motion, c'est sa patience.",
      cost: 100,
      hp: 96,
      damage: 26,
      range: 7.4,
      cooldown: 1.12,
      color: "#217a45",
      color2: "#79d592",
    },
    soldier: {
      id: "soldier",
      name: "Soldat articulé",
      role: "Tireur",
      blurb: "Rafale rapide. Il connaît les 3 règles du Commandant.",
      lore: "Articulations nettes, regard de série. Sur la chaîne @fictionarmy, une vidéo donne les 3 règles à absolument connaître avant d'acheter une S.H. Figuarts sur Vinted. Celui-ci les a suivies. #figurine #histoire #série",
      cost: 140,
      hp: 110,
      damage: 11,
      range: 8,
      cooldown: 0.36,
      color: "#d5dbe6",
      color2: "#ffffff",
    },
    collector: {
      id: "collector",
      name: "Collector",
      role: "Édition limitée",
      blurb: "Super-attaque de zone autour de lui.",
      lore: "Numéro 01 de la collection. Quand il déclenche sa pose finale, tout le rayon le sent.",
      cost: 200,
      hp: 130,
      damage: 36,
      range: 2.45,
      cooldown: 1.62,
      aoe: true,
      color: "#e2b431",
      color2: "#ffe7a3",
    },
    camera: {
      id: "camera",
      name: "Caméra à likes",
      role: "Soutien",
      blurb: "Fait apparaître des cœurs à récolter.",
      lore: "Le vrai trésor de la chambre : celle qui filme, celle qui récolte les cœurs.",
      cost: 60,
      hp: 84,
      damage: 0,
      range: 0,
      cooldown: 6.4,
      spawnsLike: 25,
      color: "#2b2833",
      color2: "#8a8298",
    },
  };

  FA.ENEMIES = {
    dust: {
      id: "dust",
      name: "Grain de poussière",
      lore: "Né sous le lit. Il veut la place des figurines, pas leur histoire.",
      hp: 48,
      speed: 8.4,
      damage: 10,
      attackEvery: 0.95,
      reward: 12,
      color: "#d9d0c1",
      color2: "#b7ad9c",
    },
    carton: {
      id: "carton",
      name: "Monstre-carton",
      lore: "Un colis oublié qui a décidé de garder ce qu'il transportait.",
      hp: 160,
      speed: 5.1,
      damage: 18,
      attackEvery: 1.05,
      reward: 24,
      color: "#e0b36a",
      color2: "#c4843e",
    },
    rival: {
      id: "rival",
      name: "Figurine rivale",
      lore: "Peinture trop belle, articulations douteuses. Elle a sauté les 3 règles.",
      hp: 82,
      speed: 11.2,
      damage: 13,
      attackEvery: 0.78,
      reward: 18,
      color: "#7a5cff",
      color2: "#d5cbff",
    },
    boss: {
      id: "boss",
      name: "Le Vieux Carton",
      lore: "La boîte du fond de l'armoire. Il avance lentement et encaisse toute la nuit.",
      hp: 1100,
      speed: 3.3,
      damage: 26,
      attackEvery: 0.88,
      reward: 140,
      leak: 2,
      color: "#a56b3c",
      color2: "#e7c49a",
    },
  };

  FA.LEVELS = [
    {
      id: "sf",
      theme: "sf",
      night: 1,
      name: "Étagère de science-fiction",
      summary: "Les armures s'éveillent. La poussière aussi.",
      tip: "Les intrus arrivent par la droite. Chevalier face à eux, archer vers la vitrine.",
      win: "Le rayon du haut est encore à toi.",
      startLikes: 150,
      lives: 5,
      waves: [
        w([0, "dust", 2], [1.5, "dust", 2], [3, "dust", 2], [4.6, "dust", 2], [6.4, "dust", 2]),
        w([0, "dust", 1], [1.1, "dust", 1], [2.3, "dust", 1], [0.6, "dust", 3], [1.8, "dust", 3], [3.1, "dust", 3]),
        w([0, "carton", 2], [2, "dust", 2], [3.2, "dust", 1], [3.5, "dust", 3], [5.5, "carton", 1], [7.2, "dust", 4]),
        w(
          [0, "dust", 0],
          [0.4, "dust", 2],
          [0.8, "dust", 4],
          [2.4, "carton", 1],
          [2.8, "carton", 3],
          [5.5, "dust", 2],
          [6.2, "dust", 2],
          [8, "carton", 2]
        ),
        w(
          [0, "carton", 2],
          [1.2, "carton", 0],
          [1.6, "carton", 4],
          [3.4, "dust", 1],
          [3.7, "dust", 1],
          [4, "dust", 3],
          [4.3, "dust", 3],
          [6.5, "carton", 2],
          [8.5, "dust", 0],
          [8.8, "dust", 4]
        ),
      ],
    },
    {
      id: "desk",
      theme: "desk",
      night: 2,
      name: "Bureau de gaming",
      summary: "Un carton de livraison est resté ouvert.",
      tip: "Les rivales sont rapides. Couvre chaque rayon marqué en rose.",
      win: "Le tapis de souris est propre. Pour cette nuit.",
      startLikes: 170,
      lives: 5,
      waves: [
        w([0, "rival", 2], [1.3, "rival", 2], [2.7, "rival", 2], [4.2, "dust", 2], [5.4, "dust", 2]),
        w([0, "rival", 1], [0.5, "rival", 3], [2, "rival", 1], [2.4, "rival", 3], [4.2, "dust", 2]),
        w([0, "carton", 2], [0.8, "rival", 2], [2.2, "rival", 0], [2.6, "rival", 4], [4.5, "carton", 1], [6.2, "dust", 3]),
        w(
          [0, "rival", 0],
          [0.4, "rival", 1],
          [0.8, "rival", 3],
          [1.2, "rival", 4],
          [3, "carton", 2],
          [5, "rival", 2],
          [6.5, "dust", 1],
          [6.8, "dust", 3]
        ),
        w(
          [0, "carton", 1],
          [0.6, "carton", 3],
          [2, "rival", 1],
          [2.3, "rival", 3],
          [4, "rival", 0],
          [4.3, "rival", 4],
          [6.2, "carton", 2],
          [8, "rival", 2]
        ),
        w(
          [0, "rival", 2],
          [0.7, "carton", 0],
          [1, "carton", 4],
          [2.5, "rival", 1],
          [2.8, "rival", 3],
          [4.4, "carton", 2],
          [6, "rival", 0],
          [6.3, "rival", 4],
          [8, "carton", 1],
          [8.4, "carton", 3]
        ),
      ],
    },
    {
      id: "dresser",
      theme: "dresser",
      night: 3,
      name: "Commode des héros",
      summary: "Mangas, affiches, et une file d'attente devant les tiroirs.",
      tip: "Les cartons tiennent longtemps. Un guerrier derrière le chevalier accélère le combat.",
      win: "Les héros restent sur la commode, dans la pose que tu as choisie.",
      startLikes: 185,
      lives: 5,
      waves: [
        w([0, "carton", 2], [1.6, "dust", 2], [2.2, "rival", 2], [3.6, "dust", 1], [4, "dust", 3]),
        w([0, "rival", 0], [0.4, "rival", 4], [1.6, "carton", 1], [2, "carton", 3], [4, "dust", 2], [4.4, "dust", 2]),
        w(
          [0, "carton", 2],
          [1.2, "carton", 2],
          [2.8, "rival", 1],
          [3.1, "rival", 3],
          [5, "dust", 0],
          [5.3, "dust", 4],
          [7, "rival", 2]
        ),
        w(
          [0, "rival", 1],
          [0.3, "rival", 2],
          [0.6, "rival", 3],
          [2.2, "carton", 0],
          [2.6, "carton", 4],
          [4.4, "carton", 2],
          [6.2, "rival", 1],
          [6.5, "rival", 3]
        ),
        w(
          [0, "carton", 0],
          [0.5, "carton", 2],
          [1, "carton", 4],
          [2.6, "rival", 1],
          [2.9, "rival", 3],
          [4.4, "dust", 2],
          [4.7, "dust", 2],
          [6.4, "carton", 1],
          [6.8, "carton", 3]
        ),
        w(
          [0, "rival", 2],
          [0.8, "carton", 2],
          [1.6, "rival", 0],
          [1.9, "rival", 4],
          [3.2, "carton", 1],
          [3.6, "carton", 3],
          [5.2, "rival", 1],
          [5.5, "rival", 2],
          [5.8, "rival", 3],
          [7.6, "carton", 2],
          [9, "carton", 0],
          [9.3, "carton", 4]
        ),
      ],
    },
    {
      id: "invasion",
      theme: "invasion",
      night: 4,
      name: "La grande invasion",
      summary: "La poussière s'est alliée au carton. Toute la collection est en jeu.",
      tip: "Le Vieux Carton avance au milieu. Double cette ligne : un mur devant, des tireurs derrière.",
      win: "La chambre entière a tenu. L'armée des étagères veille jusqu'au matin.",
      startLikes: 220,
      lives: 5,
      waves: [
        w([0, "dust", 0], [0.3, "dust", 1], [0.6, "dust", 2], [0.9, "dust", 3], [1.2, "dust", 4], [3, "carton", 2]),
        w([0, "rival", 1], [0.4, "rival", 3], [1.6, "carton", 0], [2, "carton", 4], [3.6, "rival", 2], [5, "dust", 2]),
        w(
          [0, "carton", 2],
          [1, "rival", 2],
          [2.2, "carton", 1],
          [2.6, "carton", 3],
          [4.2, "rival", 0],
          [4.5, "rival", 4],
          [6.2, "carton", 2]
        ),
        w(
          [0, "rival", 0],
          [0.4, "rival", 1],
          [0.8, "rival", 2],
          [1.2, "rival", 3],
          [1.6, "rival", 4],
          [3.4, "carton", 1],
          [3.8, "carton", 3],
          [5.6, "carton", 2],
          [7.2, "rival", 2]
        ),
        w(
          [0, "carton", 0],
          [0.6, "carton", 2],
          [1.2, "carton", 4],
          [2.8, "rival", 1],
          [3.1, "rival", 3],
          [4.6, "carton", 2],
          [6.2, "rival", 0],
          [6.5, "rival", 4],
          [8, "dust", 2],
          [8.3, "dust", 2]
        ),
        w(
          [0, "carton", 1],
          [0.4, "carton", 2],
          [0.8, "carton", 3],
          [2.4, "rival", 0],
          [2.7, "rival", 4],
          [4.2, "carton", 2],
          [6, "rival", 1],
          [6.3, "rival", 2],
          [6.6, "rival", 3],
          [8.2, "carton", 0],
          [8.6, "carton", 4]
        ),
        w(
          [0, "boss", 2],
          [2.2, "dust", 0],
          [2.5, "dust", 4],
          [4, "rival", 1],
          [4.3, "rival", 3],
          [6.2, "carton", 0],
          [6.6, "carton", 4],
          [9, "rival", 1],
          [9.3, "rival", 3],
          [12, "carton", 2],
          [14.5, "carton", 1],
          [14.8, "carton", 3]
        ),
      ],
    },
  ];

  FA.upgradeCost = function (level) {
    return [55, 100][level - 1] ?? null;
  };

  FA.hpOf = function (type, level) {
    const mul = [1, 1.38, 1.8][level - 1] || 1;
    return Math.round(FA.UNITS[type].hp * mul);
  };

  FA.damageOf = function (type, level) {
    const base = FA.UNITS[type].damage;
    if (!base) return 0;
    const mul = [1, 1.4, 1.85][level - 1] || 1;
    return Math.round(base * mul);
  };

  FA.rangeLabel = function (unit) {
    if (unit.spawnsLike) return "Fait apparaître des likes";
    if (unit.aoe) return "Attaque de zone";
    if (unit.range < 3) return "Au contact";
    return "Tir sur le rayon";
  };

  FA.figureHTML = function (type) {
    const u = FA.UNITS[type];
    const extra = {
      knight: '<i class="plume"></i><i class="shield"></i><i class="sword"></i>',
      warrior: '<i class="horn l"></i><i class="horn r"></i><i class="axe"></i>',
      archer: '<i class="hood"></i><i class="bow"></i>',
      soldier: '<i class="visor"></i><i class="blaster"></i>',
      collector: '<i class="cape"></i><i class="blade"></i><i class="gem"></i>',
      camera: '<i class="lens"></i><i class="tripod l"></i><i class="tripod r"></i>',
    }[type] || "";
    return (
      '<div class="toy toy-' + type + '" style="--c:' + u.color + ";--c2:" + u.color2 + '">' +
      '<i class="shadow"></i>' +
      '<div class="toy-scale">' +
      extra +
      '<i class="leg l"></i><i class="leg r"></i><i class="body"></i><i class="head"></i>' +
      "</div></div>"
    );
  };

  FA.enemyHTML = function (type) {
    const e = FA.ENEMIES[type];
    const tag = type === "rival" ? '<b class="tag">?</b>' : "";
    return (
      '<div class="foe foe-' + type + '" style="--c:' + e.color + ";--c2:" + e.color2 + '">' +
      '<div class="foe-scale">' + tag +
      '<i class="eye l"></i><i class="eye r"></i><i class="mouth"></i>' +
      '<i class="bit a"></i><i class="bit b"></i>' +
      "</div></div>"
    );
  };

  FA.SECRET = {
    title: "Les 3 règles",
    href: "https://www.tiktok.com/@fictionarmy/video/7677307328269487393",
    profile: "https://www.tiktok.com/@fictionarmy",
  };
})();
