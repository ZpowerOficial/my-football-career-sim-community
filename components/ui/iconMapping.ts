// FA → Lucide Icon Name Mapping
// Used for migrating Font Awesome icon names to Lucide equivalents
// Usage: faToLucide["fa-trophy"] returns "Trophy"

export const faToLucide: Record<string, string> = {
    // Trophies & Awards
    "fa-trophy": "Trophy",
    "fa-award": "Award",
    "fa-medal": "Medal",
    "fa-certificate": "BadgeCheck",
    "fa-star": "Star",
    "fa-gem": "Gem",
    "fa-diamond": "Diamond",
    "fa-crown": "Crown",

    // Geography & Globe
    "fa-globe": "Globe",
    "fa-globe-americas": "Globe",
    "fa-earth-americas": "Globe",
    "fa-earth-asia": "Globe",
    "fa-earth-europa": "Globe",
    "fa-flag": "Flag",
    "fa-map-location-dot": "MapPin",
    "fa-map-marker-alt": "MapPin",

    // People & Users
    "fa-user": "User",
    "fa-users": "Users",
    "fa-user-tie": "UserCog",
    "fa-user-slash": "UserX",
    "fa-users-rectangle": "Users",
    "fa-child-reaching": "Baby",
    "fa-user-clock": "Clock4",

    // Sports & Football
    "fa-futbol": "SoccerBall",
    "fa-shield": "Shield",
    "fa-shield-halved": "Shield",
    "fa-dumbbell": "Dumbbell",
    "fa-shoe-prints": "Footprints",
    "fa-running": "PersonStanding",
    "fa-person-running": "PersonStanding",

    // Arrows & Navigation
    "fa-arrow-up": "ArrowUp",
    "fa-arrow-down": "ArrowDown",
    "fa-arrow-trend-up": "TrendingUp",
    "fa-chevron-right": "ChevronRight",
    "fa-chevron-down": "ChevronDown",
    "fa-chevron-up": "ChevronUp",
    "fa-exchange-alt": "ArrowLeftRight",
    "fa-arrows-rotate": "RefreshCw",
    "fa-random": "Shuffle",

    // UI & Controls
    "fa-check": "Check",
    "fa-check-circle": "CircleCheck",
    "fa-times": "X",
    "fa-times-circle": "CircleX",
    "fa-plus": "Plus",
    "fa-plus-circle": "CirclePlus",
    "fa-minus": "Minus",
    "fa-equals": "Equal",
    "fa-info-circle": "Info",

    // Status & Alerts
    "fa-exclamation-triangle": "TriangleAlert",
    "fa-triangle-exclamation": "TriangleAlert",
    "fa-bolt": "Zap",
    "fa-fire": "Flame",
    "fa-heart": "Heart",
    "fa-heartbeat": "HeartPulse",
    "fa-heart-pulse": "HeartPulse",

    // Charts & Data
    "fa-chart-line": "TrendingUp",
    "fa-chart-bar": "ChartColumn",
    "fa-chart-pie": "ChartPie",
    "fa-chart-simple": "ChartNoAxesColumn",

    // Documents & Files
    "fa-file": "File",
    "fa-file-contract": "FileText",
    "fa-file-signature": "Signature",
    "fa-signature": "Signature",
    "fa-newspaper": "Newspaper",
    "fa-clipboard-list": "ClipboardList",
    "fa-list-ol": "ListOrdered",

    // Money & Commerce
    "fa-coins": "Coins",
    "fa-euro-sign": "Euro",
    "fa-piggy-bank": "PiggyBank",
    "fa-briefcase": "Briefcase",
    "fa-suitcase-rolling": "Luggage",

    // Health & Medical
    "fa-hospital": "Hospital",
    "fa-medkit": "Cross",
    "fa-suitcase-medical": "Cross",
    "fa-brain": "Brain",

    // Social & Communication
    "fa-handshake": "Handshake",
    "fa-thumbs-up": "ThumbsUp",
    "fa-thumbs-down": "ThumbsDown",
    "fa-bullhorn": "Megaphone",
    "fa-microphone": "Mic",
    "fa-camera": "Camera",
    "fa-hand-holding-heart": "HeartHandshake",
    "fa-hands-holding-heart": "HeartHandshake",
    "fa-hand-sparkles": "Sparkles",
    "fa-hands": "Hand",
    "fa-hands-helping": "Hand",
    "fa-handshake-angle": "Hand",

    // Settings & Tools
    "fa-cog": "Settings",
    "fa-download": "Download",
    "fa-save": "Save",
    "fa-lock": "Lock",
    "fa-key": "Key",
    "fa-filter": "Filter",
    "fa-building": "Building",

    // Nature & Weather
    "fa-sun": "Sun",
    "fa-seedling": "Sprout",

    // Gaming & Entertainment
    "fa-dice": "Dice5",
    "fa-ghost": "Ghost",
    "fa-mask": "Drama",
    "fa-robot": "Bot",
    "fa-champagne-glasses": "Wine",
    "fa-gift": "Gift",
    "fa-chess-king": "Crown",

    // Time & Schedule
    "fa-clock": "Clock",
    "fa-calendar": "Calendar",
    "fa-spinner": "LoaderCircle",

    // Misc
    "fa-house": "House",
    "fa-home": "House",
    "fa-route": "Route",
    "fa-diagram-project": "Network",
    "fa-language": "Languages",
    "fa-palette": "Palette",
    "fa-film": "Film",
    "fa-utensils": "UtensilsCrossed",
    "fa-spa": "Leaf",
    "fa-balance-scale": "Scale",
    "fa-table": "Table",
    "fa-bullseye": "Target",
    "fa-flag-checkered": "Flag",
    "fa-face-angry": "Frown",
    "fa-smile": "Smile",

    // Goalkeeper specific
    "fa-hand-paper": "Hand",
    "fa-percentage": "Percent",

    // Training types / legacy app usage
    "fa-crosshairs": "Target",
    "fa-magic": "Sparkles",
    "fa-user-shield": "Shield",
    "fa-child": "Baby",
    "fa-meteor": "Flame",
    "fa-compress-arrows-alt": "Minimize2",
    "fa-arrows-alt-h": "MoveHorizontal",
    "fa-project-diagram": "Network",
    "fa-graduation-cap": "GraduationCap",
    "fa-wind": "Wind",
    "fa-umbrella": "Umbrella",
    "fa-mobile": "Smartphone",
    "fa-mobile-alt": "Smartphone",
    "fa-fist-raised": "Hand",
    "fa-play": "Play",
    "fa-sack-dollar": "Wallet",
    "fa-dollar-sign": "DollarSign",
    "fa-mars": "Mars",
    "fa-venus": "Venus",
    "fa-chess": "Castle",
    "fa-google-play": "GooglePlay",
    "fa-google": "Google",
};

// Helper function to convert FA class to Lucide name
export function faClassToLucideName(faClass: string): string {
    // Handle both "fa-icon" and "fa-solid fa-icon" formats
    const match = faClass.match(/fa-([a-z0-9-]+)/);
    if (match) {
        const faName = `fa-${match[1]}`;
        return faToLucide[faName] || "HelpCircle"; // Fallback to help icon
    }
    return "HelpCircle";
}
