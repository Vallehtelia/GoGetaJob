// Profile routes

import type { FastifyInstance } from 'fastify';
import { updateProfileSchema } from './schemas.js';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { ok, fail } from '../../utils/httpResponse.js';

export default async function profileRoutes(fastify: FastifyInstance) {
  // Get current user's profile
  fastify.get('/profile', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            profilePictureUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          return fail(reply, 404, 'User not found', 'NotFound');
        }

        return ok(reply, user);
      } catch (error: any) {
        fastify.log.error(error);
        throw error;
      }
    },
  });

  // Update current user's profile
  fastify.patch('/profile', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const updates = updateProfileSchema.parse(request.body);

        // Update user profile
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: updates,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            profilePictureUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return ok(reply, updatedUser, 'Profile updated successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        fastify.log.error(error);
        throw error;
      }
    },
  });

  // Upload profile picture
  fastify.post('/profile/picture', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        
        // Get the uploaded file
        const data = await request.file();
        
        if (!data) {
          return fail(reply, 400, 'No file uploaded', 'BadRequest');
        }

        // Validate file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          return fail(
            reply,
            400,
            'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
            'BadRequest'
          );
        }

        // Generate unique filename
        const ext = data.filename.split('.').pop() || 'jpg';
        const filename = `${userId}-${randomUUID()}.${ext}`;
        const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
        const filepath = path.join(uploadsDir, filename);

        // Save file
        await pipeline(data.file, createWriteStream(filepath));

        // Update user's profile picture URL
        const profilePictureUrl = `/uploads/profile-pictures/${filename}`;
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: { profilePictureUrl },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            profilePictureUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return ok(reply, updatedUser, 'Profile picture uploaded successfully');
      } catch (error: any) {
        fastify.log.error(error);
        return fail(reply, 500, 'Failed to upload profile picture', 'InternalServerError');
      }
    },
  });

  // Delete profile picture
  fastify.delete('/profile/picture', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;

        // Update user's profile picture URL to null
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: { profilePictureUrl: null },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            profilePictureUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return ok(reply, updatedUser, 'Profile picture deleted successfully');
      } catch (error: any) {
        fastify.log.error(error);
        return fail(reply, 500, 'Failed to delete profile picture', 'InternalServerError');
      }
    },
  });
}
