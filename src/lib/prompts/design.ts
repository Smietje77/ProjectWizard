export const DESIGN_ANALYSIS_PROMPT = `Analyseer deze screenshot/design afbeelding en extraheer de volgende design elementen.

Antwoord in dit exacte JSON formaat (geen extra tekst):
{
  "stijl": "beschrijving van de algemene design stijl",
  "kleuren": {
    "primair": "#hex",
    "secundair": "#hex",
    "achtergrond": "#hex",
    "tekst": "#hex",
    "accent": "#hex"
  },
  "typografie": {
    "headings": "beschrijving (bijv. bold sans-serif, grote gewichten)",
    "body": "beschrijving (bijv. lichte sans-serif, goede leesbaarheid)",
    "aanbevolen_fonts": ["font1", "font2"]
  },
  "layout": {
    "patroon": "beschrijving (bijv. sidebar + content, grid-based)",
    "spacing": "beschrijving (bijv. veel witruimte, compact, relaxed)"
  },
  "componenten": {
    "border_radius": "beschrijving (bijv. rounded-lg, geen, pill-shaped)",
    "schaduwen": "beschrijving (bijv. subtiele schaduwen, geen, dramatisch)",
    "kaarten": "beschrijving van card-stijl",
    "knoppen": "beschrijving van button-stijl"
  },
  "sfeer": "1-2 zinnen die de algehele sfeer/feel beschrijven",
  "tailwind_hints": ["relevante", "tailwind", "klassen"]
}`;
