// src/lib/server/logger.ts
// Structured logging met request IDs

export interface LogEntry {
	timestamp: string;
	requestId: string;
	level: 'info' | 'warn' | 'error';
	message: string;
	[key: string]: unknown;
}

export interface Logger {
	info(message: string, data?: Record<string, unknown>): void;
	warn(message: string, data?: Record<string, unknown>): void;
	error(message: string, error?: unknown, data?: Record<string, unknown>): void;
}

function formatEntry(requestId: string, level: LogEntry['level'], message: string, data?: Record<string, unknown>): LogEntry {
	return {
		timestamp: new Date().toISOString(),
		requestId,
		level,
		message,
		...data
	};
}

export function createLogger(requestId: string): Logger {
	return {
		info(message: string, data?: Record<string, unknown>) {
			console.log(JSON.stringify(formatEntry(requestId, 'info', message, data)));
		},
		warn(message: string, data?: Record<string, unknown>) {
			console.warn(JSON.stringify(formatEntry(requestId, 'warn', message, data)));
		},
		error(message: string, error?: unknown, data?: Record<string, unknown>) {
			const errorData: Record<string, unknown> = { ...data };
			if (error instanceof Error) {
				errorData.errorMessage = error.message;
				errorData.stack = error.stack;
			} else if (error) {
				errorData.errorMessage = String(error);
			}
			console.error(JSON.stringify(formatEntry(requestId, 'error', message, errorData)));
		}
	};
}
