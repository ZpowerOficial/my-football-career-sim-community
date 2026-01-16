import React, { useState, useRef, useEffect, useMemo } from "react";
import { useI18n, Language } from "../contexts/I18nContext";
import type { PositionDetail, Continent, CareerMode } from "../types";
import { APP_VERSION } from "../constants/version";
import { NATIONALITIES } from "../constants/general";
import { DonationModal } from "./DonationModal";
import { PlayGamesMenu, PlayGamesButton } from "./PlayGamesMenu";
import { JourneyPanel } from "./JourneyPanel";
import ToggleSwitch from "./ui/ToggleSwitch";
import { Icon } from "./ui/Icon";
import { Select } from "./ui/Select";

interface SetupScreenProps {
  onStart: (
    position: PositionDetail,
    continent: Continent,
    gender: "male" | "female",
    customName?: string,
    customCountry?: string,
    careerMode?: CareerMode,
  ) => void;
  continents: Continent[];
  onShowLeaderboard?: () => void;
  onLoadGame?: () => void;
  hasSave?: boolean;
  isRetiredSave?: boolean;
  animationsEnabled: boolean;
  onToggleAnimations: (enabled: boolean) => void;
  step: "landing" | "create";
  onStepChange: (step: "landing" | "create") => void;
}

const POSITIONS: { title: string; options: PositionDetail[] }[] = [
  { title: "Attackers", options: ["ST", "CF", "LW", "RW"] },
  { title: "Midfielders", options: ["CAM", "CM", "LM", "RM", "CDM"] },
  { title: "Defenders", options: ["CB", "LB", "RB", "LWB", "RWB"] },
  { title: "Goalkeeper", options: ["GK"] },
];

const SetupScreen: React.FC<SetupScreenProps> = ({
  onStart,
  continents,
  onShowLeaderboard,
  onLoadGame,
  hasSave = false,
  isRetiredSave = false,
  animationsEnabled,
  onToggleAnimations,
  step,
  onStepChange,
}) => {
  // UI layers: landing (config/create/leaderboard) and create (existing form)
  // const [step, setStep] = useState<"landing" | "create">("landing"); // Removido em favor das props
  const [selectedPosition, setSelectedPosition] =
    useState<PositionDetail>("ST");
  const [selectedContinent, setSelectedContinent] = useState<Continent>(
    continents[0],
  );
  const [selectedGender, setSelectedGender] = useState<"male" | "female">(
    "male",
  );
  const [selectedCareerMode, setSelectedCareerMode] =
    useState<CareerMode>("dynamic");
  const [customName, setCustomName] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showPlayGames, setShowPlayGames] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("fcs_theme") || "classic";
    } catch {
      return "classic";
    }
  });
  const { language, setLanguage, t } = useI18n();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Persist theme choice and apply global attribute
  useEffect(() => {
    try {
      localStorage.setItem("fcs_theme", selectedTheme);
      document.documentElement.setAttribute("data-theme", selectedTheme);
    } catch { }
  }, [selectedTheme]);

  // Verifica se há conteúdo para scroll
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } =
          scrollContainerRef.current;
        const hasScroll = scrollHeight > clientHeight;
        const isAtBottom = scrollHeight - scrollTop <= clientHeight + 10; // margem de 10px
        setShowScrollIndicator(hasScroll && !isAtBottom);
      }
    };

    checkScroll();
    window.addEventListener("resize", checkScroll);

    const scrollContainer = scrollContainerRef.current;
    scrollContainer?.addEventListener("scroll", checkScroll);

    return () => {
      window.removeEventListener("resize", checkScroll);
      scrollContainer?.removeEventListener("scroll", checkScroll);
    };
  }, []);

  // LANDING LAYER
  if (step === "landing") {
    return (
      <div
        className="flex flex-col h-full w-full"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Logo - FIXA no topo */}
        <div className="px-6 pt-2 pb-4 text-center flex-shrink-0 flex items-center justify-center">
          <img
            src="/logo.svg"
            alt="My Football Career Simulator"
            className="h-28 sm:h-36 w-28 sm:w-36 object-contain drop-shadow-[0_12px_48px_rgba(34,197,94,0.45)] animate-subtle-pulse"
            onError={(e) => {
              // Fallback to text logo - uses hardcoded strings as this is an error handler
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="text-center">
                    <div class="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-400 to-purple-500 leading-tight mb-1">
                      Football Career
                    </div>
                    <div class="text-base sm:text-lg font-light text-gray-300 tracking-wide">Simulator</div>
                  </div>
                `;
              }
            }}
          />
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-6 hide-scrollbar">
          <div className="max-w-md w-full mx-auto space-y-2.5">
            {/* Continue Career (if has save and not retired) */}
            {step === "landing" && hasSave && !isRetiredSave && onLoadGame && (
              <button
                onClick={onLoadGame}
                className="group w-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white font-bold py-3.5 px-6 rounded-xl text-sm hover:scale-[1.02] active:scale-[0.98] transform transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                <Icon
                  name="Play"
                  size={16}
                  weight="duotone"
                  className="text-white relative z-10"
                />
                <span className="relative z-10">
                  {t("setup.continueCareer")}
                </span>
              </button>
            )}

            {/* Create Player */}
            <button
              onClick={() => onStepChange("create")}
              className="group w-full bg-gradient-to-r from-green-500 via-emerald-600 to-green-600 text-white font-bold py-3.5 px-6 rounded-xl text-sm hover:scale-[1.02] active:scale-[0.98] transform transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <Icon
                name="UserPlus"
                size={16}
                weight="duotone"
                className="text-emerald-400 relative z-10"
              />
              <span className="relative z-10">
                {hasSave ? t("setup.newCareer") : t("setup.startCareer")}
              </span>
            </button>

            {/* Leaderboard */}
            {onShowLeaderboard && (
              <button
                onClick={onShowLeaderboard}
                className="group w-full bg-slate-700/80 hover:bg-slate-600/90 active:bg-slate-800 backdrop-blur-sm transition-all duration-200 text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-center gap-3 shadow-lg border border-slate-600/50 hover:border-slate-500/70"
              >
                <Icon
                  name="Trophy"
                  size={16}
                  weight="duotone"
                  className="text-amber-400 group-hover:scale-110 transition-transform"
                />
                <span>{t("setup.leaderboard")}</span>
              </button>
            )}

            {/* My Journey */}
            <button
              onClick={() => setShowJourney(true)}
              className="w-full bg-slate-700/80 active:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl text-sm transition-colors flex items-center justify-center gap-3 shadow-lg border border-slate-600/50"
            >
              <Icon
                name="Route"
                size={16}
                weight="duotone"
                className="text-blue-400"
              />
              <span>{t("journey.menuButton")}</span>
            </button>
            {/* Settings Toggle */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="group w-full bg-slate-700/80 hover:bg-slate-600/90 active:bg-slate-800 backdrop-blur-sm transition-all duration-200 text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center justify-between gap-3 shadow-lg border border-slate-600/50 hover:border-slate-500/70"
            >
              <span className="flex items-center gap-3">
                <Icon
                  name="Settings"
                  size={16}
                  weight="duotone"
                  className="text-slate-400"
                />
                <span>{t("setup.settings")}</span>
              </span>
              <Icon
                name="CaretDown"
                size={12}
                weight="regular"
                className={`text-slate-400 transition-transform duration-200 ${showConfig ? "rotate-180" : ""}`}
              />
            </button>

            {showConfig && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in space-y-3 relative z-10">
                {/* Theme selector */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      name="Palette"
                      size={14}
                      weight="duotone"
                      className="text-purple-400"
                    />
                    <span className="text-xs text-slate-300 font-medium">
                      {t("setup.theme")}
                    </span>
                  </div>
                  <Select
                    value={selectedTheme}
                    onChange={setSelectedTheme}
                    options={[
                      {
                        value: "classic",
                        label: t("setup.themeOptions.classic"),
                        icon: "🎨",
                      },
                      {
                        value: "dark",
                        label: t("setup.themeOptions.dark"),
                        icon: "🌑",
                      },
                      {
                        value: "light",
                        label: t("setup.themeOptions.light"),
                        icon: "🌕",
                      },
                      {
                        value: "football",
                        label: t("setup.themeOptions.football"),
                        icon: "⚽",
                      },
                    ]}
                    size="sm"
                    accentColor="purple"
                    showIcon
                    className="w-36"
                  />
                </div>

                {/* Language selector */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      name="Globe"
                      size={14}
                      weight="duotone"
                      className="text-blue-400"
                    />
                    <span className="text-xs text-slate-300 font-medium">
                      {t("setup.language")}
                    </span>
                  </div>
                  <Select
                    value={language}
                    onChange={(val) => setLanguage(val as Language)}
                    options={[
                      {
                        value: "en",
                        label: "English",
                        icon: "🇬🇧",
                      },
                      {
                        value: "pt",
                        label: "Português (beta)",
                        icon: "🇧🇷",
                      },
                      {
                        value: "es",
                        label: "Español (beta)",
                        icon: "🇪🇸",
                      },
                      {
                        value: "fr",
                        label: "Français (beta)",
                        icon: "🇫🇷",
                      },
                      {
                        value: "ko",
                        label: "한국어 (beta)",
                        icon: "🇰🇷",
                      },
                      {
                        value: "ru",
                        label: "Русский (beta)",
                        icon: "🇷🇺",
                      },
                      {
                        value: "ja",
                        label: "日本語 (beta)",
                        icon: "🇯🇵",
                      },
                      {
                        value: "tr",
                        label: "Türkçe (beta)",
                        icon: "🇹🇷",
                      },
                      {
                        value: "id",
                        label: "Bahasa Indonesia (beta)",
                        icon: "🇮🇩",
                      },
                    ]}
                    size="sm"
                    accentColor="blue"
                    showIcon
                    className="flex-1 max-w-[180px]"
                  />
                </div>

                {/* Animation Toggle */}
                <div className="pt-5 pb-4 border-t border-slate-700/50 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        name="Film"
                        size={16}
                        weight="duotone"
                        className="text-green-400"
                      />
                      <div className="text-xs uppercase tracking-wider text-white font-bold">
                        {t("setup.animations")}
                      </div>
                    </div>
                    <div className="text-slate-400 text-xs leading-relaxed">
                      {t("setup.animationsHint")}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <ToggleSwitch
                      id="animations-toggle"
                      checked={animationsEnabled}
                      onChange={onToggleAnimations}
                    />
                  </div>
                </div>

                {/* Google Play Games */}
                <div className="pt-4 border-t border-slate-700/50">
                  <PlayGamesButton onClick={() => setShowPlayGames(true)} />
                </div>
              </div>
            )}

            {/* Donate Button */}
            <button
              onClick={() => setShowDonation(true)}
              className="group w-full bg-slate-800/60 hover:bg-slate-700/70 text-slate-200 font-semibold py-2.5 px-5 rounded-xl text-xs transition-all border border-slate-700/50 hover:border-amber-500/50 flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <Icon
                name="Heart"
                size={14}
                strokeColor="text-amber-400"
                fillColor="fill-amber-400/25"
                className="group-hover:scale-110 transition-transform"
              />
              <span>{t("donation.supportProject")}</span>
            </button>
          </div>
        </div>

        {/* Donation Modal */}
        <DonationModal
          isOpen={showDonation}
          onClose={() => setShowDonation(false)}
        />

        {/* Play Games Modal */}
        <PlayGamesMenu
          isOpen={showPlayGames}
          onClose={() => setShowPlayGames(false)}
        />

        {/* Journey Panel Modal */}
        {showJourney && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
            <div className="relative w-full max-w-md h-[85vh] flex flex-col bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
              {/* Close button */}
              <button
                onClick={() => setShowJourney(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 active:bg-slate-700 text-slate-400"
              >
                <Icon name="X" size={14} />
              </button>

              <JourneyPanel
                continents={continents}
                onSelectCareer={(position, continent, gender, xpBonus) => {
                  setShowJourney(false);
                  if (xpBonus > 0) {
                    try {
                      localStorage.setItem(
                        "fcs_career_xp_bonus",
                        xpBonus.toString(),
                      );
                    } catch { }
                  }
                  onStart(
                    position,
                    continent,
                    gender,
                    undefined,
                    undefined,
                    selectedCareerMode,
                  );
                }}
              />
            </div>
          </div>
        )}

        {/* Footer - FIXO no fundo */}
        <div className="px-6 pt-4 pb-2 text-center flex-shrink-0">
          {/* Social Links - Horizontal acima da versão */}
          <div className="flex justify-center gap-3 mb-2">
            <a
              href="https://www.instagram.com/zpower.oficial/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-slate-700/80 hover:bg-slate-600/90
                         flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              aria-label="Instagram"
            >
              <Icon name="InstagramLogo" size={16} className="text-slate-400" weight="fill" />
            </a>

            <a
              href="https://discord.gg/d3JRuDxg4n"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-slate-700/80 hover:bg-slate-600/90
                         flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              aria-label="Discord"
            >
              <Icon name="DiscordLogo" size={16} className="text-slate-400" weight="fill" />
            </a>
          </div>

          <div className="text-slate-600 text-[10px] font-medium tracking-wider">
            {t("setup.version", { version: APP_VERSION })}
          </div>
          <div className="text-slate-500 text-xs">
            by <span className="font-semibold text-slate-300">Zpower</span>
          </div>
        </div>
      </div>
    );
  }

  // CREATE LAYER (existing UI)
  return (
    <div
      className="flex flex-col h-full w-full p-4 sm:p-6"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      {/* Caixa preta com altura máxima e scroll interno */}
      <div className="flex-grow flex flex-col min-h-0 pb-2">
        <div className="bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-600/60 w-full max-w-4xl mx-auto flex flex-col max-h-full overflow-hidden">
          {/* Área de conteúdo com scroll */}
          <div
            ref={scrollContainerRef}
            className="flex-grow overflow-y-auto scrollbar-hide p-4 sm:p-5"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Custom Name (Optional) - FIRST OPTION */}
            <div className="mb-5">
              <label className="block text-base sm:text-lg font-semibold mb-2.5 text-gray-200 text-center">
                {t("setup.playerName")}{" "}
                <span className="text-xs text-gray-500 font-normal">
                  ({t("setup.optional")})
                </span>
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={30}
                placeholder={t("setup.playerNamePlaceholder")}
                className="w-full bg-gray-800/80 border border-gray-600 text-white py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-center font-semibold text-sm sm:text-base placeholder:text-gray-500 placeholder:font-normal"
              />
            </div>

            {/* Position Selection */}
            <div className="mb-5">
              <label className="block text-base sm:text-lg font-semibold text-gray-200 text-center mb-3">
                {t("setup.chooseYourPosition")}
              </label>
              <div className="space-y-2.5">
                {POSITIONS.map((group) => (
                  <div key={group.title} className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-gray-400 text-center uppercase tracking-wide">
                      {{
                        Attackers: t("setup.attackers"),
                        Midfielders: t("setup.midfielders"),
                        Defenders: t("setup.defenders"),
                        Goalkeeper: t("setup.goalkeeper"),
                      }[group.title] || group.title}
                    </h4>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {group.options.map((pos) => {
                        const key = `positions.abbr.${pos}`;
                        const translated = t(key);
                        const label = translated === key ? pos : translated;
                        return (
                          <button
                            key={pos}
                            onClick={() => setSelectedPosition(pos)}
                            className={`py-2 px-2 text-center rounded-lg font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900 transform hover:scale-105 active:scale-95
                          ${selectedPosition === pos
                                ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105 border-2 border-green-400"
                                : "bg-gray-800/80 border border-gray-600 text-gray-300 hover:bg-gray-700/80 hover:border-gray-500"
                              }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Continent Selection */}
            <div className="mb-5">
              <label className="block text-base sm:text-lg font-semibold mb-2.5 text-gray-200 text-center">
                {t("setup.startingContinent")}
              </label>
              <select
                value={selectedContinent}
                onChange={(e) => {
                  setSelectedContinent(e.target.value as Continent);
                  setSelectedCountry(""); // Reset country when continent changes
                }}
                className="w-full bg-gray-800/80 border border-gray-600 text-white py-2.5 px-4 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-center font-semibold text-sm sm:text-base cursor-pointer"
              >
                {continents.map((cont) => (
                  <option key={cont} value={cont}>
                    {t(`continents.${cont}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Selection (Optional) */}
            <div className="mb-5">
              <label className="block text-base sm:text-lg font-semibold mb-2.5 text-gray-200 text-center">
                {t("setup.country")}{" "}
                <span className="text-xs text-gray-500 font-normal">
                  ({t("setup.optional")})
                </span>
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-600 text-white py-2.5 px-4 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-center font-semibold text-sm sm:text-base cursor-pointer"
              >
                <option value="">{t("setup.randomCountry")}</option>
                {NATIONALITIES.filter((n) => {
                  // Map continent names to match NATIONALITIES
                  const continentMap: { [key: string]: string } = {
                    Europe: "Europe",
                    "South America": "South America",
                    Africa: "Africa",
                    Asia: "Asia",
                    "North America": "North America",
                    Australia: "Australia",
                  };
                  return n.continent === continentMap[selectedContinent];
                })
                  .map((nat) => {
                    const translatedName = t(`countries.${nat.name}`);
                    const displayName = translatedName.startsWith("countries.")
                      ? nat.name
                      : translatedName;
                    return { ...nat, displayName };
                  })
                  .sort((a, b) =>
                    a.displayName.localeCompare(b.displayName, "pt"),
                  ) // Sort alphabetically
                  .map((nat) => (
                    <option key={nat.name} value={nat.name}>
                      {nat.displayName}
                    </option>
                  ))}
              </select>
            </div>

            {/* Gender Selection */}
            <div className="mb-2">
              <label className="block text-base sm:text-lg font-semibold mb-2.5 text-gray-200 text-center">
                {t("setup.gender")}
              </label>
              <div className="flex flex-col sm:flex-row justify-center gap-2">
                <button
                  onClick={() => setSelectedGender("male")}
                  className={`flex items-center justify-center px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900 transform hover:scale-105 active:scale-95
                ${selectedGender === "male"
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 border-2 border-blue-400"
                      : "bg-gray-800/80 border border-gray-600 text-gray-300 hover:bg-gray-700/80 hover:border-gray-500"
                    }`}
                >
                  <Icon
                    name="GenderMale"
                    size={16}
                    weight={selectedGender === "male" ? "fill" : "bold"}
                    className={`mr-2 ${selectedGender === "male" ? "text-white" : "text-slate-400"}`}
                  />
                  {t("setup.male")}
                </button>
                <button
                  onClick={() => setSelectedGender("female")}
                  className={`flex items-center justify-center px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900 transform hover:scale-105 active:scale-95
                ${selectedGender === "female"
                      ? "bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30 scale-105 border-2 border-pink-400"
                      : "bg-gray-800/80 border border-gray-600 text-gray-300 hover:bg-gray-700/80 hover:border-gray-500"
                    }`}
                >
                  <Icon
                    name="GenderFemale"
                    size={16}
                    weight={selectedGender === "female" ? "fill" : "bold"}
                    className={`mr-2 ${selectedGender === "female" ? "text-white" : "text-slate-400"}`}
                  />
                  {t("setup.female")}
                </button>
              </div>
            </div>

            {/* Career Mode Selection */}
            <div className="mb-2">
              <label className="block text-base sm:text-lg font-semibold mb-2.5 text-gray-200 text-center">
                {t("setup.careerMode")}
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCareerMode("dynamic")}
                  className={`w-full p-3 rounded-lg text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 relative
                    ${selectedCareerMode === "dynamic"
                      ? "bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-2 border-green-500 shadow-lg"
                      : "bg-gray-800/80 border border-gray-600 hover:bg-gray-700/80 hover:border-gray-500"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* CSS-only radio button */}
                    <div className="relative">
                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${selectedCareerMode === "dynamic"
                          ? "border-green-500 bg-green-500/20"
                          : "border-gray-500 bg-gray-800"
                          }`}
                      >
                        {selectedCareerMode === "dynamic" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-fade-in" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">
                        {t("setup.modeDynamic")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {t("setup.modeDynamicDesc")}
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedCareerMode("tactical")}
                  className={`w-full p-3 rounded-lg text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 relative
                    ${selectedCareerMode === "tactical"
                      ? "bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border-2 border-purple-500 shadow-lg"
                      : "bg-gray-800/80 border border-gray-600 hover:bg-gray-700/80 hover:border-gray-500"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {/* CSS-only radio button */}
                    <div className="relative">
                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${selectedCareerMode === "tactical"
                          ? "border-purple-500 bg-purple-500/20"
                          : "border-gray-500 bg-gray-800"
                          }`}
                      >
                        {selectedCareerMode === "tactical" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-fade-in" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">
                        {t("setup.modeTactical")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {t("setup.modeTacticalDesc")}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          {/* Indicador de scroll - fora da área de scroll, dentro da caixa preta */}
          <div className="flex justify-center py-2 border-t border-gray-700/30 sm:hidden">
            <div className="text-gray-400 animate-bounce">
              <Icon
                name="CaretDown"
                size={12}
                weight="regular"
                className="text-gray-400 animate-bounce"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex-shrink-0 space-y-2 pt-2 -mx-4 px-4">
        <button
          onClick={() => onStepChange("landing")}
          className="w-full bg-slate-700/80 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg text-sm flex items-center justify-center gap-2"
        >
          <Icon
            name="ArrowLeft"
            size={14}
            strokeColor="text-white"
            className="flex-shrink-0"
          />
          {t("setup.back")}
        </button>

        <button
          onClick={() => {
            const allPositions = POSITIONS.flatMap((p) => p.options);
            const randomPosition =
              allPositions[Math.floor(Math.random() * allPositions.length)];
            const randomContinent =
              continents[Math.floor(Math.random() * continents.length)];
            const randomGender = Math.random() > 0.5 ? "male" : "female";

            try {
              localStorage.setItem("fcs_career_xp_bonus", "25");
            } catch { }

            onStart(
              randomPosition,
              randomContinent,
              randomGender,
              undefined,
              undefined,
              "dynamic",
            );
          }}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg text-sm hover:scale-[1.02] active:scale-100 transform transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Icon
            name="Dice5"
            size={16}
            strokeColor="text-white"
            className="flex-shrink-0"
          />
          {t("journey.surpriseMe")}
          <span className="bg-black/20 px-2 py-0.5 rounded text-xs">
            +25% XP
          </span>
        </button>

        <button
          onClick={() =>
            onStart(
              selectedPosition,
              selectedContinent,
              selectedGender,
              customName.trim() || undefined,
              selectedCountry || undefined,
              selectedCareerMode,
            )
          }
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg text-sm hover:scale-[1.02] active:scale-100 transform transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Icon
            name="SoccerBall"
            size={16}
            strokeColor="text-white"
            className="flex-shrink-0"
          />
          {hasSave ? t("setup.newCareer") : t("setup.startCareer")}
        </button>
      </div>
    </div>
  );
};

export default SetupScreen;
