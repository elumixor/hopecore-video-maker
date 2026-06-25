// Visual style presets for MontageVideo

export interface VideoStyle {
  name: string;
  // CSS filter applied to all video
  videoFilter: string;
  // Accent color for subtitle highlight
  accentColor: string;
  // Warm color overlay (rgba)
  warmOverlay: string;
  // Top bloom gradient
  bloomGradient: string;
  // Vignette gradient
  vignetteGradient: string;
}

export const STYLES: Record<string, VideoStyle> = {
  hopecore: {
    name: "Hopecore",
    videoFilter: "brightness(1.10) contrast(0.84) saturate(1.25) sepia(0.15)",
    accentColor: "#FFD600",
    warmOverlay: "rgba(255,175,60,0.09)",
    bloomGradient: "radial-gradient(ellipse 130% 55% at 50% -5%, rgba(255,245,185,0.20) 0%, transparent 60%)",
    vignetteGradient: "radial-gradient(ellipse at 50% 42%, transparent 38%, rgba(28,10,0,0.42) 100%)",
  },

  cinematic: {
    name: "Cinematic",
    videoFilter: "brightness(0.92) contrast(1.10) saturate(0.85)",
    accentColor: "#FFFFFF",
    warmOverlay: "rgba(0,20,40,0.08)",
    bloomGradient: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%)",
    vignetteGradient: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)",
  },

  minimal: {
    name: "Minimal",
    videoFilter: "brightness(1.03) contrast(0.95) saturate(1.05)",
    accentColor: "#FFFFFF",
    warmOverlay: "rgba(0,0,0,0)",
    bloomGradient: "rgba(0,0,0,0)",
    vignetteGradient: "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.25) 100%)",
  },

  retro: {
    name: "Retro",
    videoFilter: "brightness(1.05) contrast(0.88) saturate(0.75) sepia(0.35)",
    accentColor: "#FF8C42",
    warmOverlay: "rgba(255,140,50,0.10)",
    bloomGradient: "radial-gradient(ellipse 100% 40% at 50% 0%, rgba(255,220,150,0.18) 0%, transparent 60%)",
    vignetteGradient: "radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(30,15,0,0.55) 100%)",
  },

  dark: {
    name: "Dark / Dramatic",
    videoFilter: "brightness(0.85) contrast(1.15) saturate(1.10)",
    accentColor: "#00E5FF",
    warmOverlay: "rgba(0,0,0,0)",
    bloomGradient: "radial-gradient(ellipse 120% 40% at 50% 0%, rgba(0,80,120,0.15) 0%, transparent 55%)",
    vignetteGradient: "radial-gradient(ellipse at 50% 42%, transparent 30%, rgba(0,0,0,0.70) 100%)",
  },
};

export const DEFAULT_STYLE = "hopecore";
