// Mapeamento de cores de bandeira para degradê de seleções nacionais
// Suporta configuração de ângulo para melhor fidelidade visual (vertical vs horizontal)

type FlagConfig = {
  colors: string[];
  angle?: string; // default "120deg"
};

export const NATIONAL_FLAG_DATA: Record<string, FlagConfig> = {
  // === EUROPA ===
  France: { colors: ["#0055A4", "#FFFFFF", "#EF4135"], angle: "90deg" }, // Vertical
  Italy: { colors: ["#009246", "#FFFFFF", "#CE2939"], angle: "90deg" }, // Vertical
  Germany: { colors: ["#000000", "#DD0000", "#FFCE00"], angle: "180deg" }, // Horizontal
  Belgium: { colors: ["#000000", "#FDDA24", "#EF3340"], angle: "90deg" }, // Vertical
  Netherlands: { colors: ["#AE1C28", "#FFFFFF", "#21468B"], angle: "180deg" }, // Horizontal
  Spain: { colors: ["#AA151B", "#F1BF00", "#AA151B"], angle: "180deg" }, // Horizontal
  Portugal: { colors: ["#006600", "#FF0000"], angle: "90deg" }, // Vertical
  England: { colors: ["#FFFFFF", "#CF142B"], angle: "90deg" }, // Cruz
  Croatia: { colors: ["#FF0000", "#FFFFFF", "#0093DD"], angle: "180deg" }, // Horizontal
  Poland: { colors: ["#FFFFFF", "#DC143C"], angle: "180deg" }, // Horizontal
  Ukraine: { colors: ["#0057B8", "#FFD700"], angle: "180deg" }, // Horizontal
  Russia: { colors: ["#FFFFFF", "#0039A6", "#D52B1E"], angle: "180deg" }, // Horizontal
  Austria: { colors: ["#ED2939", "#FFFFFF", "#ED2939"], angle: "180deg" }, // Horizontal
  Hungary: { colors: ["#CE2939", "#FFFFFF", "#477050"], angle: "180deg" }, // Horizontal
  Romania: { colors: ["#002B7F", "#FCD116", "#CE1126"], angle: "90deg" }, // Vertical
  Ireland: { colors: ["#169B62", "#FFFFFF", "#FF883E"], angle: "90deg" }, // Vertical
  Greece: { colors: ["#0D5EAF", "#FFFFFF", "#0D5EAF"], angle: "180deg" }, // Horizontal
  Denmark: { colors: ["#C60C30", "#FFFFFF"], angle: "90deg" }, // Nordic Cross
  Switzerland: { colors: ["#FF0000", "#FFFFFF"], angle: "90deg" }, // Cross
  Serbia: { colors: ["#C6363C", "#0C4076", "#FFFFFF"], angle: "180deg" }, // Horizontal
  Sweden: { colors: ["#006AA7", "#FECC00"], angle: "90deg" }, // Nordic Cross
  Norway: { colors: ["#BA0C2F", "#00205B"], angle: "90deg" }, // Nordic Cross
  Scotland: { colors: ["#005EB8", "#FFFFFF"], angle: "135deg" }, // Saltire
  Wales: { colors: ["#FFFFFF", "#00AC3E", "#C8102E"], angle: "180deg" }, // Horizontal
  Turkey: { colors: ["#E30A17", "#FFFFFF"], angle: "180deg" }, // Red with White
  "Czech Republic": {
    colors: ["#FFFFFF", "#D7141A", "#11457E"],
    angle: "180deg",
  }, // Horizontal

  // === AMÉRICA DO SUL ===
  Brazil: { colors: ["#009C3B", "#FFDF00", "#002776"], angle: "135deg" }, // Diagonal
  Argentina: { colors: ["#74ACDF", "#FFFFFF", "#74ACDF"], angle: "180deg" }, // Horizontal
  Uruguay: { colors: ["#FFFFFF", "#0038A8"], angle: "180deg" }, // Horizontal
  Colombia: { colors: ["#FCD116", "#003893", "#CE1126"], angle: "180deg" }, // Horizontal
  Chile: { colors: ["#0039A6", "#FFFFFF", "#D52B1E"], angle: "180deg" }, // Horizontal
  Peru: { colors: ["#D91023", "#FFFFFF", "#D91023"], angle: "90deg" }, // Vertical
  Venezuela: { colors: ["#FCE300", "#0038A8", "#CE1126"], angle: "180deg" }, // Horizontal
  Ecuador: { colors: ["#FFDD00", "#034EA2", "#ED1C24"], angle: "180deg" }, // Horizontal
  Bolivia: { colors: ["#D52B1E", "#F9E300", "#007A33"], angle: "180deg" }, // Horizontal
  Paraguay: { colors: ["#D52B1E", "#FFFFFF", "#0038A8"], angle: "180deg" }, // Horizontal

  // === AMÉRICA DO NORTE ===
  USA: { colors: ["#B22234", "#FFFFFF", "#3C3B6E"], angle: "180deg" }, // Horizontal
  Mexico: { colors: ["#006847", "#FFFFFF", "#CE1126"], angle: "90deg" }, // Vertical
  Canada: { colors: ["#FF0000", "#FFFFFF", "#FF0000"], angle: "90deg" }, // Vertical
  "Costa Rica": { colors: ["#002B7F", "#FFFFFF", "#CE1126"], angle: "180deg" }, // Horizontal
  Jamaica: { colors: ["#000000", "#009B3A", "#FED100"], angle: "135deg" }, // Diagonal
  Panama: { colors: ["#DA121A", "#FFFFFF", "#072357"], angle: "90deg" }, // Quarters

  // === ÁFRICA ===
  Nigeria: { colors: ["#008751", "#FFFFFF", "#008751"], angle: "90deg" }, // Vertical
  "Ivory Coast": { colors: ["#F77F00", "#FFFFFF", "#009E60"], angle: "90deg" }, // Vertical
  Cameroon: { colors: ["#007A3D", "#CE1126", "#FCD116"], angle: "90deg" }, // Vertical
  Senegal: { colors: ["#00853F", "#FDEF42", "#CE1126"], angle: "90deg" }, // Vertical
  Ghana: { colors: ["#CE1126", "#FCD116", "#006B3F"], angle: "180deg" }, // Horizontal
  Egypt: { colors: ["#CE1126", "#FFFFFF", "#000000"], angle: "180deg" }, // Horizontal
  Morocco: { colors: ["#C1272D", "#006233"], angle: "180deg" }, // Horizontal
  Algeria: { colors: ["#006233", "#FFFFFF"], angle: "90deg" }, // Vertical
  Tunisia: { colors: ["#E70013", "#FFFFFF"], angle: "180deg" }, // Red with white
  Mali: { colors: ["#14B53A", "#FCD116", "#CE1126"], angle: "90deg" }, // Vertical
  "Burkina Faso": {
    colors: ["#EF3340", "#009739", "#FCD116"],
    angle: "180deg",
  }, // Horizontal
  "South Africa": {
    colors: ["#007749", "#FFB81C", "#000000", "#E03C31", "#001489", "#FFFFFF"],
    angle: "135deg",
  }, // Diagonal

  // === ÁSIA ===
  Japan: { colors: ["#FFFFFF", "#BC002D"], angle: "radial" }, // Radial
  "South Korea": { colors: ["#FFFFFF", "#C60C30", "#003478"], angle: "135deg" },
  China: { colors: ["#EE1C25", "#FFFF00"], angle: "135deg" },
  "Saudi Arabia": { colors: ["#006C35", "#FFFFFF"], angle: "135deg" },
  Iran: { colors: ["#239F40", "#FFFFFF", "#DA0000"], angle: "180deg" }, // Horizontal
  Australia: { colors: ["#00008B", "#FFFFFF", "#FF0000"], angle: "135deg" }, // Blue with stars
  Qatar: { colors: ["#FFFFFF", "#8D1B3D"], angle: "90deg" }, // Vertical
  Iraq: { colors: ["#CE1126", "#FFFFFF", "#000000"], angle: "180deg" }, // Horizontal
  UAE: { colors: ["#00732F", "#FFFFFF", "#000000", "#FF0000"], angle: "90deg" }, // Vertical
  India: { colors: ["#FF9933", "#FFFFFF", "#138808"], angle: "180deg" }, // Horizontal
};

// Fallback para países não listados
const DEFAULT_FLAG: FlagConfig = {
  colors: ["#222", "#888", "#fff"],
  angle: "120deg",
};

export function getNationalFlagStyle(nation: string): { background: string } {
  const config = NATIONAL_FLAG_DATA[nation];

  if (!config) {
    return generateGradientStyle(DEFAULT_FLAG);
  }

  return generateGradientStyle(config);
}

function generateGradientStyle(config: FlagConfig): { background: string } {
  const { colors, angle = "135deg" } = config;

  if (angle === "radial") {
    return {
      background: `radial-gradient(circle at center, ${colors[1]} 0%, ${colors[0]} 80%)`,
    };
  }

  if (colors.length === 2) {
    const [c1, c2] = colors;
    return {
      background: `linear-gradient(${angle}, ${c1} 0%, ${c2} 100%)`,
    };
  }

  if (colors.length === 3) {
    const [c1, c2, c3] = colors;
    // Sophisticated blend for 3 colors
    return {
      background: `linear-gradient(${angle}, ${c1} 0%, ${c2} 45%, ${c2} 55%, ${c3} 100%)`,
    };
  }

  return { background: `linear-gradient(${angle}, ${colors.join(", ")})` };
}

// Deprecated: kept for backward compatibility
export function getNationalFlagGradient(nation: string): string[] {
  return NATIONAL_FLAG_DATA[nation]?.colors || DEFAULT_FLAG.colors;
}
