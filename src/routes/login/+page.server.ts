import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Vul e-mail en wachtwoord in' });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(401, { error: 'Ongeldige inloggegevens' });
		}

		// Redirect naar de oorspronkelijke pagina of home
		const redirectTo = url.searchParams.get('redirectTo') ?? '/';
		throw redirect(303, redirectTo);
	}
};
