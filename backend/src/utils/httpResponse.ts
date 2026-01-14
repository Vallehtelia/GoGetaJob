import type { FastifyReply } from 'fastify';

export type SuccessEnvelope<T> = { data: T; message?: string };
export type ErrorEnvelope = { statusCode: number; message: string; error?: string };

export function ok<T>(reply: FastifyReply, data: T, message?: string) {
  const payload: SuccessEnvelope<T> = message ? { data, message } : { data };
  return reply.send(payload);
}

export function created<T>(reply: FastifyReply, data: T, message?: string) {
  const payload: SuccessEnvelope<T> = message ? { data, message } : { data };
  return reply.code(201).send(payload);
}

export function noContent(reply: FastifyReply) {
  return reply.code(204).send();
}

export function fail(reply: FastifyReply, statusCode: number, message: string, error?: string) {
  const payload: ErrorEnvelope = error ? { statusCode, message, error } : { statusCode, message };
  return reply.code(statusCode).send(payload);
}
