---
name: prompt-generator
description: Skill voor het genereren van complete Claude Code projectmappen. Gebruik voor het creëren van CLAUDE.md, PROMPT.md, .mcp.json, agents, en skills configuraties.
---

# Prompt Generator Skill

## Doel
Genereer een complete projectmap op basis van wizard antwoorden.

## Output Structuur
```
{project-naam}/
├── CLAUDE.md              # Project context
├── PROMPT.md              # Start prompt
├── .mcp.json              # MCP configuraties
├── .env.example           # Environment template
├── .env.local             # Ingevulde keys (indien beschikbaar)
├── .gitignore             # Git ignore regels
├── agents/
│   ├── coordinator.md     # Hoofd coordinator
│   └── specialists/       # Project-specifieke specialists
├── skills/                # Project-specifieke skills
└── templates/             # Opgeslagen templates (optioneel)
```

## CLAUDE.md Generatie
Bevat:
- Project overzicht en doel
- Tech stack met versies
- Bash commands (dev, build, test)
- Architectuur overzicht
- Database schema (als van toepassing)
- Code conventies
- Belangrijke flows

## PROMPT.md Generatie
Bevat:
- Wat is dit project (samenvatting)
- Gefaseerde bouwinstructies
- Belangrijke requirements
- Kwaliteitscriteria checklist
- Start instructies

## .mcp.json Generatie
Gebaseerd op gekozen integraties:
```json
{
  "mcpServers": {
    // Alleen MCPs die daadwerkelijk nodig zijn
  }
}
```

## .env Generatie
### .env.example
- Alle benodigde variabelen
- Comments met uitleg
- Links naar dashboards

### .env.local (indien keys ingevuld)
- Daadwerkelijke waardes
- NIET naar git committen

## Agents Generatie
Kopieer relevante specialists gebaseerd op:
- Frontend keuze → frontend.md
- Database keuze → backend.md
- Deployment keuze → devops.md
- Integraties → integration.md

## Lokaal Opslaan
```typescript
async function generateProject(state: WizardState): Promise<void> {
  const outputPath = `C:\\claude_projects\\${state.projectName}`;
  
  // Maak directories
  await createDirectories(outputPath);
  
  // Genereer bestanden
  await writeFile(`${outputPath}/CLAUDE.md`, generateClaudeMd(state));
  await writeFile(`${outputPath}/PROMPT.md`, generatePromptMd(state));
  await writeFile(`${outputPath}/.mcp.json`, generateMcpJson(state));
  // ... etc
}
```
