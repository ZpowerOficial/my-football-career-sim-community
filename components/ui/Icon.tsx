import React from "react";
import * as PhosphorIcons from "@phosphor-icons/react";

export type PhosphorWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

export type IconName = string;

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  name: string;
  size?: number;
  className?: string;
  weight?: PhosphorWeight;
  variant?: "outline" | "solid"; // legacy
  strokeColor?: string; // legacy helper (tailwind class)
  fillColor?: string; // legacy helper (tailwind class)
}

/**
 * Normaliza nomes legados, especialmente classes FontAwesome.
 * Exemplos:
 *  - "fa-solid fa-house"   -> "fa-house"
 *  - "fa-regular fa-flag"  -> "fa-flag"
 *  - "fa-futbol"           -> "fa-futbol"
 */
function normalizeLegacyName(raw: string): string {
  const trimmed = raw.trim();

  // Se não tem "fa-" em lugar nenhum, devolve direto
  if (!trimmed.includes("fa-")) return trimmed;

  const parts = trimmed.split(/\s+/);

  const STYLE_CLASSES = new Set([
    "fa-solid",
    "fa-regular",
    "fa-light",
    "fa-thin",
    "fa-duotone",
    "fa-brands",
  ]);

  const faName =
    parts.find(
      (p) => p.startsWith("fa-") && !STYLE_CLASSES.has(p)
    ) || trimmed;

  return faName;
}

const LEGACY_MAP: Record<string, string> = {
  // FontAwesome -> Phosphor
  "fa-futbol": "SoccerBall",
  "fa-users": "UsersThree",
  "fa-trophy": "Trophy",
  "fa-star": "Star",
  "fa-star-half-stroke": "StarHalf",
  "fa-balance-scale": "Scales",
  "fa-spa": "Leaf",
  "fa-running": "Person",
  "fa-dumbbell": "Barbell",
  "fa-wind": "Wind",
  "fa-bullseye": "Crosshair",
  "fa-project-diagram": "Network",
  "fa-arrow-up": "ArrowUp",
  "fa-flag": "Flag",
  "fa-hand-paper": "Hand",
  "fa-shoe-prints": "Footprints",
  "fa-shield-alt": "Shield",
  "fa-compress-arrows-alt": "CornersIn",
  "fa-forward": "CaretRight",
  "fa-arrows-alt-h": "ArrowsLeftRight",
  "fa-brain": "Brain",
  "fa-umbrella": "Umbrella",
  "fa-bolt": "Lightning",

  // Novos mapeamentos FontAwesome que aparecem no código
  "fa-house": "House",
  "fa-flag-checkered": "FlagCheckered",
  "fa-rotate-right": "ArrowClockwise",
  "fa-circle-notch": "CircleNotch",
  "fa-share-nodes": "ShareNetwork",
  "fa-user-check": "UserCheck",
  "fa-chart-simple": "ChartLineUp",
  "fa-id-card": "IdentificationCard",
  "fa-timeline": "ChartLine",
  "fa-crosshairs": "Crosshair",
  "fa-child": "Baby",

  // ========================================
  // Lucide -> Phosphor (migração principal)
  // ========================================
  
  // Arrows & Navigation
  ArrowLeftRight: "ArrowsLeftRight",
  ArrowsLeftRight: "ArrowsLeftRight",
  RotateCw: "ArrowClockwise",
  Reply: "ArrowBendUpLeft",
  ChevronDown: "CaretDown",
  ChevronUp: "CaretUp",
  ChevronRight: "CaretRight",
  
  // Charts & Data
  ChartColumn: "ChartBar",
  TrendingUp: "TrendUp",
  BarChart3: "ChartBar",
  
  // Circle variants
  CircleAlert: "WarningCircle",
  CircleCheck: "CheckCircle",
  CircleDot: "RadioButton",
  CirclePlus: "PlusCircle",
  CircleX: "XCircle",
  
  // Documents & Files
  ClipboardList: "ClipboardText",
  Save: "FloppyDisk",
  FileText: "FileText",
  
  // Icons that need direct mapping
  BadgeDollarSign: "CurrencyDollar",
  Bot: "Robot",
  Dumbbell: "Barbell",
  Filter: "Funnel",
  FlagTriangleRight: "FlagPennant",
  Loader: "CircleNotch",
  Search: "MagnifyingGlass",
  Share2: "ShareNetwork",
  ShieldHalf: "ShieldCheck",
  Shirt: "TShirt",
  Store: "Storefront",
  Zap: "Lightning",
  
  // User variants
  UserCog: "UserGear",
  UserX: "UserMinus",
  
  // Misc mappings
  Dices: "DiceFive",
  Dice5: "DiceFive",
  Quote: "Quotes",
  Scale: "Scales",
  Smile: "Smiley",
  TriangleAlert: "Warning",
  GooglePlay: "GooglePlayLogo",
  Google: "GoogleLogo",
  
  // Common legacy names
  Route: "MapTrifold",
  Settings: "Gear",
  Film: "FilmScript",
  Award: "Trophy",
  Play: "Play",
  Palette: "Palette",
  Globe: "Globe",
  Gem: "Diamond",
  Mic: "Microphone",
  Frown: "SmileySad",
  UtensilsCrossed: "ForkKnife",
  Sparkles: "Sparkle",
  Mars: "GenderMale",
  Venus: "GenderFemale",
  Sprout: "Plant",
  IdCard: "IdentificationCard",
  History: "ClockCounterClockwise",
  HeartPulse: "Heartbeat",
  HandHelping: "HandHeart",


  // Additional Lucide -> Phosphor mappings
  MessageCircle: "ChatCircle",
  Mail: "Envelope",
  MailOpen: "EnvelopeOpen",
  CalendarDays: "Calendar",
  LoaderCircle: "CircleNotch",
  CirclePause: "PauseCircle",
  PenLine: "PenNib",

  // ========================================
  // Fixes from latest logs - Missing icons
  // ========================================
  Euro: "CurrencyEur",
  Gamepad2: "GameController",
  Settings2: "SlidersHorizontal",
  TrendingDown: "TrendDown",
  "fa-map-marker-alt": "MapPin",
  "fa-magic": "MagicWand",
  "fa-meteor": "Meteor",
  "fa-heartbeat": "Heartbeat",
  Heartbeat: "Heartbeat",
  CurrencyEur: "CurrencyEur",
  GameController: "GameController",
  SlidersHorizontal: "SlidersHorizontal",
  TrendDown: "TrendDown",
  MapPin: "MapPin",
  MagicWand: "MagicWand",
  Meteor: "Meteor",
  
  // Additional missing icons from logs
  Workflow: "GitBranch",
  Minimize2: "ArrowsInSimple",
  CornersIn: "ArrowsInSimple",
  ArrowsInSimple: "ArrowsInSimple",
  
  // ========================================
  // V4: Additional FontAwesome mappings from spec
  // ========================================
  "fa-medal": "Medal",
  "fa-newspaper": "Newspaper",
  "fa-calendar": "Calendar",
  "fa-clock": "Clock",
  "fa-check": "Check",
  "fa-times": "X",
  "fa-plus": "Plus",
  "fa-minus": "Minus",
  "fa-caret-up": "CaretUp",
  "fa-caret-down": "CaretDown",
  "fa-chevron-left": "CaretLeft",
  "fa-chevron-right": "CaretRight",
  "fa-arrow-right": "ArrowRight",
  "fa-arrow-left": "ArrowLeft",
  "fa-info-circle": "Info",
  "fa-exclamation-triangle": "Warning",
  "fa-question-circle": "Question",
  "fa-user": "User",
  "fa-cog": "Gear",
  "fa-search": "MagnifyingGlass",
  "fa-globe": "Globe",
  "fa-link": "Link",
  "fa-share": "Share",
  "fa-download": "Download",
  "fa-upload": "Upload",
  "fa-trash": "Trash",
  "fa-edit": "PencilSimple",
  "fa-save": "FloppyDisk",
  "fa-copy": "Copy",
  "fa-paste": "Clipboard",
  
  // V4: Additional Lucide -> Phosphor mappings
  Cog: "Gear",
  FlipHorizontal: "ArrowsLeftRight",
  BarChart: "ChartBar",
  PieChart: "ChartPie",
};

// Additional common mappings discovered across the codebase
// Note: Many moved to LEGACY_MAP above, these are extras/overrides
const EXTRA_LEGACY: Record<string, string> = {
  // Direct Phosphor names (no mapping needed, but kept for safety)
  Flag: "Flag",
  Users: "Users",
  X: "X",
  Signature: "Signature",
  Handshake: "Handshake",
  Footprints: "Footprints",
  Heart: "Heart",
  ArrowLeft: "ArrowLeft",
  Shuffle: "Shuffle",
  Gift: "Gift",
  
  // Additional mappings
  PenLine: "PenNib",
  PersonStanding: "Person",
  CalendarDays: "Calendar",
};

for (const k of Object.keys(EXTRA_LEGACY)) {
  if (!LEGACY_MAP[k]) LEGACY_MAP[k] = EXTRA_LEGACY[k];
}

function toPascal(input: string) {
  return input
    .replace(/[-_ ]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (m) => m.toUpperCase());
}

function candidateNames(name: string) {
  const candidates: string[] = [];
  candidates.push(name);
  const pascal = toPascal(name);
  candidates.push(pascal);
  candidates.push(`${pascal}Icon`);
  candidates.push(`${name}Icon`);
  return candidates;
}

// Icons that should default to "regular" weight instead of "fill"
const REGULAR_WEIGHT_ICONS = new Set([
  "X",
  "Hash",
  "GenderMale",
  "GenderFemale",
]);

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className,
  weight,
  variant,
  strokeColor,
  fillColor,
  ...rest
}) => {
  // Normaliza nomes legados (especialmente FontAwesome)
  const normalizedName = normalizeLegacyName(name);

  // legacy name map
  const mappedName = LEGACY_MAP[normalizedName] || normalizedName;

  // map legacy variant to weight
  let resolvedWeight: PhosphorWeight | undefined = weight;
  if (!resolvedWeight && variant) {
    resolvedWeight = variant === "solid" ? "fill" : "regular";
  }
  // Force regular weight for specific icons (X, Hash, Gender icons)
  if (!resolvedWeight) {
    resolvedWeight = REGULAR_WEIGHT_ICONS.has(mappedName) ? "regular" : "fill";
  }

  // Tenta várias variações de nome até achar um componente Phosphor
  let IconComponent: React.ComponentType<any> | null = null;

  for (const candidate of candidateNames(mappedName)) {
    const C = (PhosphorIcons as any)[candidate];
    if (C) {
      IconComponent = C;
      break;
    }
  }

  if (!IconComponent) {
    // fallback seguro
    IconComponent = (PhosphorIcons as any).Question || (() => null);
    if (process.env.NODE_ENV !== "production") {
      // Ajuda a encontrar ícones que ainda estão sem mapeamento
      // eslint-disable-next-line no-console
      console.warn(`[Icon] Unknown icon name "${name}" -> using Question fallback.`);
    }
  }

  const Comp = IconComponent;

  // Merge legacy tailwind color helpers into className, but don't forward them as DOM props
  const legacyClasses = [className, strokeColor, fillColor].filter(Boolean).join(" ");
  const finalClass = legacyClasses || className;

  return <Comp size={size} weight={resolvedWeight} className={finalClass} {...rest} />;
};

export default Icon;
export { Icon };