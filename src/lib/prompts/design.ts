export const DESIGN_ANALYSIS_PROMPT = `Analyseer deze screenshot/design afbeelding en extraheer alle visuele design elementen.

BELANGRIJK:
- Beschrijf de LAYOUT STRUCTUUR inclusief waar afbeeldingen zitten, maar beschrijf niet de inhoud van afbeeldingen
- Markeer afbeeldingslocaties als placeholders met aanbevolen afmetingen
- Negeer video-achtergronden — behandel ze als statische achtergrond
- Wees zo specifiek mogelijk met hex-kleuren, font-herkenning en CSS-waarden

Antwoord in dit exacte JSON formaat (geen extra tekst):
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "textMuted": "#hex",
    "border": "#hex"
  },
  "typography": {
    "headingFont": "font naam of beschrijving",
    "bodyFont": "font naam of beschrijving",
    "headingWeight": "bold | semibold | normal",
    "headingStyle": "uppercase | normal | italic",
    "bodySize": "small | medium | large",
    "lineHeight": "tight | normal | relaxed"
  },
  "layout": {
    "navigation": "topbar | sidebar | bottombar | none",
    "navigationStyle": "transparent | solid | sticky | floating",
    "heroType": "full-width | split | centered | none",
    "contentWidth": "full | contained | narrow",
    "gridPattern": "cards | list | masonry | single-column",
    "footerStyle": "minimal | detailed | multi-column | none",
    "sectionDividers": "wave | diagonal | sharp | gradient | none"
  },
  "effects": {
    "glassmorphism": false,
    "neumorphism": false,
    "gradients": {
      "used": false,
      "type": "linear | radial | conic | none",
      "description": "waar en hoe gradients worden toegepast"
    },
    "shadows": "none | subtle | elevated | dramatic",
    "backgroundEffect": "solid | gradient | grain-texture | pattern | none",
    "overlays": "gradient-dark | gradient-light | duotone | color-wash | none",
    "borderStyle": "solid | gradient-border | dashed | none",
    "glowEffects": false,
    "blurEffects": false
  },
  "imagery": {
    "placeholders": [
      {
        "location": "beschrijving waar de afbeelding zit",
        "type": "hero | product | avatar | background | icon | logo | gallery",
        "suggestedSize": "breedte x hoogte in px",
        "shape": "rectangular | square | circular | rounded | masked",
        "treatment": "full-bleed | contained | overlapping | with-shadow"
      }
    ],
    "iconStyle": "outlined | filled | duotone | hand-drawn | none",
    "illustrationStyle": "flat | 3d | isometric | abstract | none",
    "photoTreatment": "full-color | duotone | grayscale | sepia | with-overlay"
  },
  "patterns": {
    "decorativeElements": "dots | lines | geometric | organic | blob-shapes | none",
    "backgroundPatterns": "subtle-grid | noise | topography | none",
    "whitespace": "compact | balanced | generous",
    "rhythm": "uniform | varied | asymmetric"
  },
  "components": {
    "borderRadius": "none | sm | md | lg | xl | full",
    "buttonStyle": "solid | outline | ghost | gradient | pill",
    "cardStyle": "flat | elevated | bordered | glass",
    "inputStyle": "underline | bordered | filled | floating-label",
    "animationHints": ["beschrijf zichtbare of gesuggereerde animaties"]
  },
  "mood": {
    "overall": "luxury | playful | corporate | minimal | bold | retro | futuristic | organic",
    "contrast": "high | medium | low",
    "density": "dense | balanced | airy",
    "temperature": "warm | neutral | cool"
  }
}`;

// Follow-up prompt voor effecten-bevestiging
export const EFFECTS_FOLLOWUP_PROMPT = `Op basis van de screenshot-analyse zijn de volgende visuele effecten gedetecteerd:

{detected_effects}

Welke van deze effecten wil je in je project? Je kunt ook effecten toevoegen die niet gedetecteerd zijn.`;
