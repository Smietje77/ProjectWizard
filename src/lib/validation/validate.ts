import type { z } from 'zod';
import { json } from '@sveltejs/kit';

type ValidationSuccess<T> = { valid: true; data: T };
type ValidationFailure = { valid: false; error: Response };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateRequest<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
	const result = schema.safeParse(data);

	if (!result.success) {
		return {
			valid: false,
			error: json(
				{
					error: 'Validatiefout',
					details: result.error.issues.map((i) => ({
						path: i.path.join('.'),
						message: i.message
					}))
				},
				{ status: 400 }
			)
		};
	}

	return { valid: true, data: result.data };
}
