// src/lib/constants.ts
// Single source of truth voor gedeelde constanten

export const REQUIRED_CATEGORIES = [
	'website_type',
	'project_doel',
	'doelgroep',
	'kernfunctionaliteiten',
	'frontend_keuze',
	'database_keuze',
	'auth_keuze',
	'deployment_keuze',
	'design_stijl'
] as const;

export type RequiredCategory = (typeof REQUIRED_CATEGORIES)[number];

export const BONUS_CATEGORIES = [
	'merk_identiteit',
	'business_model',
	'lancering_strategie'
] as const;

export type BonusCategory = (typeof BONUS_CATEGORIES)[number];

export const ALL_CATEGORIES = [...REQUIRED_CATEGORIES, ...BONUS_CATEGORIES] as const;

export type AnyCategory = RequiredCategory | BonusCategory;

export const AVAILABLE_SPECIALISTS = [
	'requirements',
	'architect',
	'frontend',
	'backend',
	'devops',
	'integration',
	'testing',
	'design'
] as const;

export type AvailableSpecialist = (typeof AVAILABLE_SPECIALISTS)[number];
