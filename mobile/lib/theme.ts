// Design system: token condivisi (colori, spaziature, raggi, tipografia, ombre).
// Tutti gli stili dell'app derivano da qui, così il look resta coerente.

export const colors = {
  // superfici
  bg: "#F4F6FB", // sfondo app (off-white bluastro)
  surface: "#FFFFFF",
  border: "#E7EAF2",
  borderStrong: "#D5DAE6",
  inputBg: "#F1F4FA",

  // testo
  text: "#0E1729",
  textMuted: "#5B6478",
  textFaint: "#9AA2B4",

  // brand / azioni (tema tricolore: verde)
  primary: "#1B9E4D",
  primaryDark: "#0F7A38",
  primarySoft: "#E7F6EC",

  success: "#16A34A",
  successSoft: "#E7F6EC",
  danger: "#E2483F",
  dangerSoft: "#FDECEB",
  warning: "#EF9F27",
  warningSoft: "#FFF6E5",
  warningText: "#8A5A00",

  white: "#FFFFFF",

  // glass / sfumature
  onGradient: "#FFFFFF",
  onGradientMuted: "rgba(255,255,255,0.82)",
  glassFill: "rgba(255,255,255,0.55)",
  glassFillStrong: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.65)",
  glassInput: "rgba(255,255,255,0.45)",
  glassInputFocus: "rgba(255,255,255,0.85)",
} as const;

// Sfumature di sfondo (tricolore: verde → bianco → rosso, toni morbidi).
export const gradients = {
  app: ["#5FC98E", "#FFFFFF", "#EE7A72"] as const,
  // sfumatura più tenue per le schermate modali (crea / dettaglio)
  soft: ["#EAF7EF", "#FFFFFF", "#FDECEB"] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const font = {
  display: 32,
  title: 25,
  h2: 20,
  h3: 17,
  body: 16,
  small: 14,
  tiny: 12,
} as const;

export const shadow = {
  card: {
    shadowColor: "#0E1729",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  button: {
    shadowColor: "#1B9E4D",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
} as const;
