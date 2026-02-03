import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateRequest } from './validate';

describe('validateRequest', () => {
	const testSchema = z.object({
		name: z.string().min(1),
		age: z.number().int().positive()
	});

	it('returned valid=true met geparsede data voor geldige input', () => {
		const result = validateRequest(testSchema, { name: 'Jan', age: 30 });
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.data.name).toBe('Jan');
			expect(result.data.age).toBe(30);
		}
	});

	it('returned valid=false met error Response voor ongeldige input', () => {
		const result = validateRequest(testSchema, { name: '', age: -1 });
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toBeInstanceOf(Response);
		}
	});

	it('returned 400 status voor ongeldige input', async () => {
		const result = validateRequest(testSchema, { name: 123, age: 'abc' });
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error.status).toBe(400);
			const body = await result.error.json();
			expect(body.error).toBe('Validatiefout');
			expect(body.details).toBeDefined();
			expect(Array.isArray(body.details)).toBe(true);
		}
	});

	it('parsed extra velden correct met strict schemas', () => {
		const strictSchema = z.object({ name: z.string() }).strict();
		const result = validateRequest(strictSchema, { name: 'Jan', extra: 'veld' });
		expect(result.valid).toBe(false);
	});
});
