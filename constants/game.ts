import type { Agent } from "../types";

export const RIVALRIES = [
  // INGLATERRA
  { team1: "Arsenal", team2: "Tottenham Hotspur", intensity: 95 },
  { team1: "Manchester United", team2: "Liverpool", intensity: 95 },
  { team1: "Manchester United", team2: "Manchester City", intensity: 92 },
  { team1: "Liverpool", team2: "Everton", intensity: 90 },
  { team1: "Chelsea", team2: "Arsenal", intensity: 85 },
  { team1: "Newcastle United", team2: "Sunderland", intensity: 88 },
  { team1: "Aston Villa", team2: "Birmingham City", intensity: 87 },

  // ESPANHA
  { team1: "Real Madrid", team2: "Barcelona", intensity: 100 },
  { team1: "Real Madrid", team2: "Atlético Madrid", intensity: 90 },
  { team1: "Barcelona", team2: "Espanyol", intensity: 85 },
  { team1: "Sevilla", team2: "Real Betis", intensity: 92 },
  { team1: "Athletic Bilbao", team2: "Real Sociedad", intensity: 88 },
  { team1: "Valencia", team2: "Levante", intensity: 85 },

  // ALEMANHA
  { team1: "Bayern Munich", team2: "Borussia Dortmund", intensity: 90 },
  { team1: "Schalke 04", team2: "Borussia Dortmund", intensity: 95 },
  { team1: "Bayern Munich", team2: "1860 Munich", intensity: 88 },
  { team1: "Hamburger SV", team2: "Werder Bremen", intensity: 85 },
  { team1: "Borussia M'gladbach", team2: "1. FC Köln", intensity: 87 },

  // ITÁLIA
  { team1: "Inter Milan", team2: "AC Milan", intensity: 95 },
  { team1: "Juventus", team2: "Torino", intensity: 90 },
  { team1: "AS Roma", team2: "Lazio", intensity: 98 },
  { team1: "Napoli", team2: "Juventus", intensity: 85 },
  { team1: "Genoa", team2: "Sampdoria", intensity: 92 },
  { team1: "Inter Milan", team2: "Juventus", intensity: 87 },

  // FRANÇA
  { team1: "Paris Saint-Germain", team2: "Marseille", intensity: 95 },
  { team1: "Lyon", team2: "Saint-Étienne", intensity: 93 },
  { team1: "Monaco", team2: "Nice", intensity: 85 },
  { team1: "Lens", team2: "Lille", intensity: 87 },
  { team1: "Bordeaux", team2: "Toulouse", intensity: 82 },

  // HOLANDA
  { team1: "Ajax", team2: "Feyenoord", intensity: 95 },
  { team1: "Ajax", team2: "PSV Eindhoven", intensity: 90 },
  { team1: "Feyenoord", team2: "PSV Eindhoven", intensity: 85 },
  { team1: "Ajax", team2: "Utrecht", intensity: 80 },

  // PORTUGAL
  { team1: "Benfica", team2: "Porto", intensity: 95 },
  { team1: "Benfica", team2: "Sporting CP", intensity: 98 },
  { team1: "Porto", team2: "Sporting CP", intensity: 92 },
  { team1: "Benfica", team2: "Boavista", intensity: 80 },

  // TURQUIA
  { team1: "Galatasaray", team2: "Fenerbahçe", intensity: 100 },
  { team1: "Galatasaray", team2: "Beşiktaş", intensity: 95 },
  { team1: "Fenerbahçe", team2: "Beşiktaş", intensity: 95 },
  { team1: "Trabzonspor", team2: "Fenerbahçe", intensity: 85 },

  // BRASIL
  { team1: "Flamengo", team2: "Fluminense", intensity: 82 }, // Fla-Flu: menos intenso
  { team1: "Corinthians", team2: "Palmeiras", intensity: 98 },
  { team1: "São Paulo", team2: "Corinthians", intensity: 90 },
  { team1: "Grêmio", team2: "Internacional", intensity: 100 }, // Grenal: traidor
  { team1: "Atlético Mineiro", team2: "Cruzeiro", intensity: 95 },
  { team1: "Flamengo", team2: "Vasco da Gama", intensity: 98 }, // Fla-Vasco: muito intenso
  { team1: "Flamengo", team2: "Botafogo", intensity: 82 }, // Fla-Botafogo: aceito

  // ARGENTINA
  { team1: "Boca Juniors", team2: "River Plate", intensity: 100 },
  { team1: "Racing Club", team2: "Independiente", intensity: 95 },
  { team1: "San Lorenzo", team2: "Huracán", intensity: 85 },
  { team1: "Newell's Old Boys", team2: "Rosario Central", intensity: 92 },
  { team1: "Estudiantes", team2: "Gimnasia La Plata", intensity: 90 },

  // COLÔMBIA
  {
    team1: "Atlético Nacional",
    team2: "Independiente Medellín",
    intensity: 95,
  },
  { team1: "América de Cali", team2: "Deportivo Cali", intensity: 98 },
  { team1: "Millonarios", team2: "Santa Fe", intensity: 95 },
  { team1: "Junior", team2: "Unión Magdalena", intensity: 85 },

  // URUGUAI
  { team1: "Nacional", team2: "Peñarol", intensity: 100 },
  { team1: "Danubio", team2: "Defensor Sporting", intensity: 80 },
  { team1: "River Plate", team2: "Wanderers", intensity: 78 },

  // ARÁBIA SAUDITA
  { team1: "Al-Hilal", team2: "Al-Nassr", intensity: 95 },
  { team1: "Al-Hilal", team2: "Al-Ittihad", intensity: 90 },
  { team1: "Al-Ahli", team2: "Al-Ittihad", intensity: 85 },
  { team1: "Al-Shabab", team2: "Al-Nassr", intensity: 82 },

  // JAPÃO
  { team1: "Kashima Antlers", team2: "Urawa Red Diamonds", intensity: 85 },
  { team1: "Yokohama F. Marinos", team2: "Kawasaki Frontale", intensity: 88 },
  { team1: "Gamba Osaka", team2: "Cerezo Osaka", intensity: 90 },
  { team1: "FC Tokyo", team2: "Kawasaki Frontale", intensity: 82 },

  // COREIA DO SUL
  { team1: "FC Seoul", team2: "Suwon Samsung Bluewings", intensity: 90 },
  { team1: "Jeonbuk Hyundai Motors", team2: "Ulsan Hyundai", intensity: 88 },
  { team1: "Pohang Steelers", team2: "Ulsan Hyundai", intensity: 85 },

  // EUA
  { team1: "LA Galaxy", team2: "LAFC", intensity: 95 },
  { team1: "Seattle Sounders", team2: "Portland Timbers", intensity: 92 },
  { team1: "New York Red Bulls", team2: "New York City FC", intensity: 90 },
  { team1: "Atlanta United", team2: "Orlando City", intensity: 85 },

  // MÉXICO
  { team1: "América", team2: "Guadalajara", intensity: 100 },
  { team1: "Cruz Azul", team2: "América", intensity: 95 },
  { team1: "Pumas UNAM", team2: "América", intensity: 90 },
  { team1: "Monterrey", team2: "Tigres UANL", intensity: 98 },
  { team1: "Atlas", team2: "Guadalajara", intensity: 92 },

  // EGITO
  { team1: "Al Ahly", team2: "Zamalek", intensity: 100 },
  { team1: "Ismaily", team2: "Al Masry", intensity: 85 },
  { team1: "Pyramids FC", team2: "Zamalek", intensity: 80 },

  // MARROCOS
  { team1: "Wydad Casablanca", team2: "Raja Casablanca", intensity: 100 },
  { team1: "AS FAR", team2: "FUS Rabat", intensity: 85 },

  // AUSTRÁLIA
  { team1: "Sydney FC", team2: "Western Sydney Wanderers", intensity: 95 },
  { team1: "Melbourne Victory", team2: "Melbourne City", intensity: 92 },
  { team1: "Adelaide United", team2: "Melbourne Victory", intensity: 80 },
];

export const AGENTS: Agent[] = [
  // Super Agentes (Top Tier)
  {
    name: "Jorge Mendes",
    reputation: "Super Agent",
    specialty: "Negotiator",
    style: "Aggressive",
    feePercentage: 15,
  },
  {
    name: "Mino Raiola Estate",
    reputation: "Super Agent",
    specialty: "Negotiator",
    style: "Strategic",
    feePercentage: 14,
  },
  {
    name: "Jonathan Barnett",
    reputation: "Super Agent",
    specialty: "Negotiator",
    style: "Professional",
    feePercentage: 13,
  },
  {
    name: "Pini Zahavi",
    reputation: "Super Agent",
    specialty: "Negotiator",
    style: "Networked",
    feePercentage: 14,
  },
  {
    name: "Kia Joorabchian",
    reputation: "Super Agent",
    specialty: "Negotiator",
    style: "Visionary",
    feePercentage: 13,
  },

  // Agentes de Alto Nível
  {
    name: "Pere Guardiola",
    reputation: "Good",
    specialty: "Negotiator",
    style: "Patient",
    feePercentage: 12,
  },
  {
    name: "Rafaela Pimenta",
    reputation: "Good",
    specialty: "Negotiator",
    style: "Ambitious",
    feePercentage: 12,
  },
  {
    name: "Volker Struth",
    reputation: "Good",
    specialty: "Negotiator",
    style: "Methodical",
    feePercentage: 11,
  },
  {
    name: "Federico Pastorello",
    reputation: "Good",
    specialty: "Negotiator",
    style: "Charismatic",
    feePercentage: 11,
  },
  {
    name: "Fali Ramadani",
    reputation: "Good",
    specialty: "Negotiator",
    style: "Persistent",
    feePercentage: 11,
  },

  // Agentes Estabelecidos
  {
    name: "Andrea D'Amico",
    reputation: "Good",
    specialty: "Negotiator",
    style: "Reliable",
    feePercentage: 10,
  },
  {
    name: "Carlos Gonçalves",
    reputation: "Good",
    specialty: "Negotiator",
    style: "Dedicated",
    feePercentage: 10,
  },
  {
    name: "Giuliano Bertolucci",
    reputation: "Average",
    specialty: "Negotiator",
    style: "Experienced",
    feePercentage: 10,
  },
  {
    name: "Paul Martin",
    reputation: "Average",
    specialty: "Negotiator",
    style: "Traditional",
    feePercentage: 9,
  },
  {
    name: "Rob Jansen",
    reputation: "Average",
    specialty: "Negotiator",
    style: "Honest",
    feePercentage: 9,
  },

  // Agentes Emergentes
  {
    name: "Saif Rubie",
    reputation: "Average",
    specialty: "Scout",
    style: "Innovative",
    feePercentage: 9,
  },
  {
    name: "Jerome Anderson",
    reputation: "Average",
    specialty: "Scout",
    style: "Energetic",
    feePercentage: 8,
  },
  {
    name: "Ulisse Savini",
    reputation: "Average",
    specialty: "Scout",
    style: "Passionate",
    feePercentage: 8,
  },
  {
    name: "Daniel Geey",
    reputation: "Average",
    specialty: "Negotiator",
    style: "Analytical",
    feePercentage: 8,
  },
  {
    name: "Niclas Carlnén",
    reputation: "Average",
    specialty: "Negotiator",
    style: "Calm",
    feePercentage: 8,
  },

  // Agentes Regionais
  {
    name: "Ahmed Al-Harbi",
    reputation: "Rookie",
    specialty: "Scout",
    style: "Adaptable",
    feePercentage: 7,
  },
  {
    name: "Yuki Tanaka",
    reputation: "Rookie",
    specialty: "Scout",
    style: "Precise",
    feePercentage: 7,
  },
  {
    name: "Miguel Alfaro",
    reputation: "Rookie",
    specialty: "Scout",
    style: "Friendly",
    feePercentage: 7,
  },
  {
    name: "Ibrahim Hassan",
    reputation: "Rookie",
    specialty: "Scout",
    style: "Motivated",
    feePercentage: 7,
  },
  {
    name: "David Lee",
    reputation: "Rookie",
    specialty: "Scout",
    style: "Focused",
    feePercentage: 7,
  },
];
