const fs = require("fs");
const path = "core-api/data";
const players = [];
const names = [
  ["Juan","Pérez"],["Pedro","Díaz"],["Lucas","Ruiz"],["Martín","Gómez"],
  ["Diego","Nico"],["Pablo","Tomás"],["Andrés","Sosa"],["Leo","Vargas"],
  ["Facu","Molina"],["Nico","Ramos"],["Tomi","Castro"],["Mateo","Ibarra"],
  ["Agus","López"],["Bruno","Ferreyra"],["Dani","Quiroga"],["Eze","Benítez"]
];
for (let i = 0; i < names.length; i++) {
  const [firstName, lastName] = names[i];
  players.push({
    id: `player-${i + 1}`,
    userId: i === 0 ? "user-2" : null,
    displayName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    phone: `+549110000${String(i + 1).padStart(4, "0")}`,
    createdAt: "2026-09-03T10:00:00.000Z",
  });
}
const pairs = [];
const regs = [];
for (let i = 0; i < 8; i++) {
  const id = `pair-${i + 1}`;
  pairs.push({
    id,
    tournamentCategoryId: "cat-1",
    player1Id: `player-${i * 2 + 1}`,
    player2Id: `player-${i * 2 + 2}`,
    seed: i + 1,
    status: "active",
  });
  regs.push({
    id: `reg-${i + 1}`,
    tournamentCategoryId: "cat-1",
    pairId: id,
    status: "CONFIRMED",
    registeredAt: "2026-09-08T12:00:00.000Z",
  });
}
fs.writeFileSync(`${path}/players.json`, JSON.stringify(players, null, 2));
fs.writeFileSync(`${path}/pairs.json`, JSON.stringify(pairs, null, 2));
fs.writeFileSync(`${path}/registrations.json`, JSON.stringify(regs, null, 2));
fs.writeFileSync(
  `${path}/categories.json`,
  JSON.stringify(
    [
      {
        id: "cat-1",
        tournamentId: "tournament-1",
        name: "6ta Masculino",
        gender: "male",
        level: "6ta",
        maxPairs: 16,
        status: "active",
      },
    ],
    null,
    2,
  ),
);
fs.writeFileSync(
  `${path}/rulesets.json`,
  JSON.stringify(
    [
      {
        id: "rules-1",
        tournamentCategoryId: "cat-1",
        preset: "STANDARD",
        matchRules: {
          setFormat: "best_of_3",
          setsToWin: 2,
          gamesPerSet: 6,
          advantageType: "advantage",
          goldenPoint: false,
          tiebreakEnabled: true,
          tiebreakPoints: 7,
          tiebreakWinByTwo: true,
          superTiebreakEnabled: true,
          superTiebreakPoints: 10,
          superTiebreakWinByTwo: true,
        },
        tieBreakers: ["POINTS", "HEAD_TO_HEAD", "SET_DIFFERENCE", "GAME_DIFFERENCE"],
        qualifyPerGroup: 2,
        groupCount: 2,
      },
    ],
    null,
    2,
  ),
);
fs.writeFileSync(
  `${path}/courts.json`,
  JSON.stringify(
    [1, 2, 3, 4].map((n) => ({
      id: `court-${n}`,
      clubId: "club-1",
      name: `Cancha ${n}`,
      status: "active",
    })),
    null,
    2,
  ),
);
const courtAv = [];
for (const c of [1, 2, 3, 4]) {
  for (const d of ["2026-09-20", "2026-09-21"]) {
    courtAv.push({
      id: `cav-${c}-${d}`,
      courtId: `court-${c}`,
      date: d,
      startTime: "09:00",
      endTime: "23:00",
    });
  }
}
fs.writeFileSync(`${path}/courtAvailability.json`, JSON.stringify(courtAv, null, 2));
const pairAv = [];
for (let i = 1; i <= 8; i++) {
  pairAv.push({
    id: `pav-${i}`,
    pairId: `pair-${i}`,
    date: "2026-09-20",
    startTime: "10:00",
    endTime: "22:00",
    priority: 1,
  });
  pairAv.push({
    id: `pav-${i}b`,
    pairId: `pair-${i}`,
    date: "2026-09-21",
    startTime: "10:00",
    endTime: "22:00",
    priority: 1,
  });
}
fs.writeFileSync(`${path}/pairAvailability.json`, JSON.stringify(pairAv, null, 2));
for (const f of ["groups", "standings", "rounds", "matches", "matchSlots"]) {
  fs.writeFileSync(`${path}/${f}.json`, "[]");
}
console.log("seed ok");
