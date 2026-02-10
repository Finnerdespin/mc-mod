import { world } from "@minecraft/server";

const OWNER_DB_KEY = "block_owner_db_v1";

let owners = loadOwners();
const becomeMap = new Map();
const godMode = new Set();

function keyFor(block) {
  return `${block.dimension.id}|${block.location.x},${block.location.y},${block.location.z}`;
}

function loadOwners() {
  try {
    const raw = world.getDynamicProperty(OWNER_DB_KEY);
    if (typeof raw !== "string" || raw.length === 0) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveOwners() {
  try {
    world.setDynamicProperty(OWNER_DB_KEY, JSON.stringify(owners));
  } catch (error) {
    console.warn(`Kon owner-database niet opslaan: ${error}`);
  }
}

function getEffectiveName(player) {
  return becomeMap.get(player.name) ?? player.name;
}

function parseCommand(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();

  if (command === "/god") {
    return { type: "god" };
  }

  if (command === "/userbecome") {
    return { type: "userbecome", name: parts[1] };
  }

  return null;
}

world.afterEvents.worldInitialize.subscribe((event) => {
  event.propertyRegistry.registerWorldDynamicProperties({
    string: [{ name: OWNER_DB_KEY, maxLength: 32767 }],
  });
});

world.beforeEvents.chatSend.subscribe((event) => {
  const command = parseCommand(event.message);
  if (!command) return;

  event.cancel = true;
  const player = event.sender;

  if (command.type === "god") {
    if (godMode.has(player.name)) {
      godMode.delete(player.name);
      player.sendMessage("§7God-modus uitgeschakeld.");
    } else {
      godMode.add(player.name);
      player.sendMessage("§aGod-modus ingeschakeld: je mag nu alles breken.");
    }
    return;
  }

  if (command.type === "userbecome") {
    if (!command.name) {
      becomeMap.delete(player.name);
      player.sendMessage("§7/userbecome gereset: je gebruikt weer je eigen naam.");
      return;
    }

    becomeMap.set(player.name, command.name);
    player.sendMessage(`§aJe effectieve gebruikersnaam is nu: §f${command.name}`);
  }
});

world.afterEvents.playerPlaceBlock.subscribe((event) => {
  const ownerName = getEffectiveName(event.player);
  owners[keyFor(event.block)] = ownerName;
  saveOwners();
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
  const player = event.player;

  if (godMode.has(player.name)) {
    return;
  }

  const key = keyFor(event.block);
  const owner = owners[key];

  if (!owner) {
    // Natuurlijk gegenereerd of onbekend: breken is toegestaan.
    return;
  }

  const effectiveName = getEffectiveName(player);
  if (owner === effectiveName) {
    delete owners[key];
    saveOwners();
    return;
  }

  event.cancel = true;
  player.sendMessage(`§cJe mag dit blok niet breken. Geplaatst door: §f${owner}`);
});
