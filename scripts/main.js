import { DynamicPropertiesDefinition, world } from "@minecraft/server";

const OWNER_DB_KEY = "block_owner_db_v1";

let owners = {};
const becomeMap = new Map();
const godMode = new Set();

function keyFromLocation(dimensionId, location) {
  return `${dimensionId}|${location.x},${location.y},${location.z}`;
}

function keyForBlock(block) {
  return keyFromLocation(block.dimension.id, block.location);
}

function loadOwners() {
  try {
    const raw = world.getDynamicProperty(OWNER_DB_KEY);
    if (typeof raw !== "string" || raw.length === 0) return {};

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn(`Kon owner-database niet laden: ${error}`);
  }

  return {};
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

function parseCommand(rawMessage) {
  const trimmed = rawMessage.trim();
  if (!trimmed) return null;

  const withoutSlash = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const parts = withoutSlash.split(/\s+/);
  const command = parts[0].toLowerCase();

  if (command === "god") {
    return { type: "god" };
  }

  if (command === "userbecome") {
    return { type: "userbecome", name: parts[1] };
  }

  return null;
}

world.afterEvents.worldInitialize.subscribe((event) => {
  const definitions = new DynamicPropertiesDefinition();
  definitions.defineString(OWNER_DB_KEY, 32767);
  event.propertyRegistry.registerWorldDynamicProperties(definitions);

  owners = loadOwners();
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
      player.sendMessage("§aGod-modus ingeschakeld: je mag nu alle blokken breken.");
    }
    return;
  }

  if (!command.name) {
    becomeMap.delete(player.name);
    player.sendMessage("§7userbecome gereset: je gebruikt weer je eigen naam.");
    return;
  }

  becomeMap.set(player.name, command.name);
  player.sendMessage(`§aJe effectieve gebruikersnaam is nu: §f${command.name}`);
});

world.afterEvents.playerPlaceBlock.subscribe((event) => {
  const ownerName = getEffectiveName(event.player);
  owners[keyForBlock(event.block)] = ownerName;
  saveOwners();
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
  const player = event.player;

  if (godMode.has(player.name)) {
    delete owners[keyForBlock(event.block)];
    saveOwners();
    return;
  }

  const key = keyForBlock(event.block);
  const owner = owners[key];

  // Natuurlijk gegenereerd of onbekend: breken is toegestaan.
  if (!owner) return;

  const effectiveName = getEffectiveName(player);
  if (owner !== effectiveName) {
    event.cancel = true;
    player.sendMessage(`§cJe mag dit blok niet breken. Geplaatst door: §f${owner}`);
    return;
  }

  delete owners[key];
  saveOwners();
});
