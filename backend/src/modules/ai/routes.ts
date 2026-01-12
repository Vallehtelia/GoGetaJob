import { FastifyPluginAsync } from 'fastify';
import { optimizeCvSchema, chatMessageSchema } from './schemas.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getOpenAiClient, generateCvSummary, chatWithAi } from '../../services/openaiClient.js';

// Load system prompts (relative to backend root)
const systemPromptPath = join(process.cwd(), 'src/ai/prompts/cv_optimize.system.md');
const systemPrompt = readFileSync(systemPromptPath, 'utf-8');

const chatbotPromptPath = join(process.cwd(), 'src/ai/prompts/chatbot.system.md');
const chatbotSystemPrompt = readFileSync(chatbotPromptPath, 'utf-8');

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  // Optimize CV summary using AI
  fastify.post('/ai/cv/optimize', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const startTime = Date.now();
      const userId = request.user.userId;

      try {
        // Validate request body
        const body = optimizeCvSchema.parse(request.body);
        const { cvId, jobPostingText } = body;

        // Verify CV belongs to user
        const cv = await fastify.prisma.cvDocument.findFirst({
          where: {
            id: cvId,
            userId,
          },
          select: {
            id: true,
            title: true,
            template: true,
            overrideSummary: true,
          },
        });

        if (!cv) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'CV document not found',
          });
        }

        // Check if user has OpenAI key
        const openaiKey = await fastify.prisma.openAiKey.findUnique({
          where: { userId },
        });

        if (!openaiKey) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            code: 'OPENAI_KEY_NOT_SET',
            message: 'No OpenAI API key saved. Add it in Settings → API Settings.',
          });
        }

        // Load user profile
        const profile = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
          },
        });

        if (!profile) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'User profile not found',
          });
        }

        // Load included CV items (ordered)
        const [workInclusions, educationInclusions, skillInclusions, projectInclusions] =
          await Promise.all([
            fastify.prisma.cvWorkInclusion.findMany({
              where: { cvId },
              include: {
                workExperience: true,
              },
              orderBy: { order: 'asc' },
            }),
            fastify.prisma.cvEducationInclusion.findMany({
              where: { cvId },
              include: {
                education: true,
              },
              orderBy: { order: 'asc' },
            }),
            fastify.prisma.cvSkillInclusion.findMany({
              where: { cvId },
              include: {
                skill: true,
              },
              orderBy: { order: 'asc' },
            }),
            fastify.prisma.cvProjectInclusion.findMany({
              where: { cvId },
              include: {
                project: true,
              },
              orderBy: { order: 'asc' },
            }),
          ]);

        // Load available library items (not included)
        const [availableWork, availableEducation, availableSkills, availableProjects] =
          await Promise.all([
            fastify.prisma.userWorkExperience.findMany({
              where: {
                userId,
                id: {
                  notIn: workInclusions.map((w) => w.workExperienceId),
                },
              },
              take: 10, // Limit to avoid huge payloads
            }),
            fastify.prisma.userEducation.findMany({
              where: {
                userId,
                id: {
                  notIn: educationInclusions.map((e) => e.educationId),
                },
              },
              take: 10,
            }),
            fastify.prisma.userSkill.findMany({
              where: {
                userId,
                id: {
                  notIn: skillInclusions.map((s) => s.skillId),
                },
              },
              take: 20,
            }),
            fastify.prisma.userProject.findMany({
              where: {
                userId,
                id: {
                  notIn: projectInclusions.map((p) => p.projectId),
                },
              },
              take: 10,
            }),
          ]);

        // Build input payload for OpenAI
        const inputPayload = {
          jobPostingText,
          profile: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            phone: profile.phone,
            location: profile.location,
            headline: profile.headline,
            summary: profile.summary,
            linkedinUrl: profile.linkedinUrl,
            githubUrl: profile.githubUrl,
            websiteUrl: profile.websiteUrl,
          },
          cv: {
            id: cv.id,
            title: cv.title,
            template: cv.template,
          },
          included: {
            work: workInclusions.map((w) => w.workExperience),
            education: educationInclusions.map((e) => e.education),
            skills: skillInclusions.map((s) => s.skill),
            projects: projectInclusions.map((p) => p.project),
          },
          availableLibrary: {
            work: availableWork,
            education: availableEducation,
            skills: availableSkills,
            projects: availableProjects,
          },
        };

        // Format user message
        const userMessage = JSON.stringify(inputPayload, null, 2);

        // Get OpenAI client and generate summary
        const client = await getOpenAiClient({
          keyCiphertext: openaiKey.keyCiphertext,
          keyIv: openaiKey.keyIv,
          keyTag: openaiKey.keyTag,
        });

        const result = await generateCvSummary(client, systemPrompt, userMessage);

        // Update CV document with generated summary
        await fastify.prisma.cvDocument.update({
          where: { id: cvId },
          data: {
            overrideSummary: result.summary.trim(),
          },
        });

        const duration = Date.now() - startTime;

        // Log success (without sensitive data)
        fastify.log.info({
          userId,
          cvId,
          duration,
          success: true,
        }, 'CV summary generated successfully');

        return reply.send({
          message: 'AI summary generated',
          cvId,
          summary: result.summary,
          keySkills: result.keySkills,
          roleFitBullets: result.roleFitBullets,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Log error (without sensitive data)
        fastify.log.error({
          userId,
          duration,
          error: error.message,
        }, 'CV summary generation failed');

        if (error.name === 'ZodError') {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: error.errors.map((e: any) => e.message).join(', '),
          });
        }

        if (error.message?.includes('Decryption failed')) {
          return reply.code(500).send({
            statusCode: 500,
            error: 'Encryption Error',
            message: 'Failed to decrypt API key. Please update your API key in Settings.',
          });
        }

        if (error.message?.includes('No content in OpenAI response')) {
          return reply.code(500).send({
            statusCode: 500,
            error: 'AI Service Error',
            message: 'OpenAI returned an empty response. Please try again.',
          });
        }

        // OpenAI API errors
        if (error.status || error.response) {
          return reply.code(500).send({
            statusCode: 500,
            error: 'AI Service Error',
            message: 'Failed to generate summary. Please check your API key and try again.',
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to generate CV summary',
        });
      }
    },
  });

  // Chat endpoint
  fastify.post('/ai/chat', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const startTime = Date.now();
      const userId = request.user.userId;

      try {
        const body = chatMessageSchema.parse(request.body);
        const { message, conversationId } = body;

        // Check if user has OpenAI key
        const openaiKey = await fastify.prisma.openAiKey.findUnique({
          where: { userId },
        });

        if (!openaiKey) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            code: 'OPENAI_KEY_NOT_SET',
            message: 'No OpenAI API key saved. Add it in Settings → API Settings.',
          });
        }

        // Load user context data
        const [profile, workExperiences, educations, skills, projects, applications, cvs] =
          await Promise.all([
            fastify.prisma.user.findUnique({
              where: { id: userId },
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                location: true,
                headline: true,
                summary: true,
                linkedinUrl: true,
                githubUrl: true,
                websiteUrl: true,
              },
            }),
            fastify.prisma.userWorkExperience.findMany({
              where: { userId },
              orderBy: { startDate: 'desc' },
              take: 10,
            }),
            fastify.prisma.userEducation.findMany({
              where: { userId },
              orderBy: { startDate: 'desc' },
              take: 10,
            }),
            fastify.prisma.userSkill.findMany({
              where: { userId },
              take: 30,
            }),
            fastify.prisma.userProject.findMany({
              where: { userId },
              take: 10,
            }),
            fastify.prisma.jobApplication.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                company: true,
                position: true,
                status: true,
                notes: true,
              },
            }),
            fastify.prisma.cvDocument.findMany({
              where: { userId },
              select: {
                id: true,
                title: true,
                template: true,
              },
              take: 5,
            }),
          ]);

        if (!profile) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'User profile not found',
          });
        }

        // Build context message for AI
        const contextMessage = `USER CONTEXT:
Profile: ${JSON.stringify(profile)}
Work Experiences: ${JSON.stringify(workExperiences)}
Education: ${JSON.stringify(educations)}
Skills: ${JSON.stringify(skills)}
Projects: ${JSON.stringify(projects)}
Recent Applications: ${JSON.stringify(applications)}
CV Documents: ${JSON.stringify(cvs)}

USER QUESTION: ${message}`;

        // Get OpenAI client
        const client = await getOpenAiClient({
          keyCiphertext: openaiKey.keyCiphertext,
          keyIv: openaiKey.keyIv,
          keyTag: openaiKey.keyTag,
        });

        // For now, use simple chat (no conversation history stored)
        // In future, can add conversation storage with conversationId
        const response = await chatWithAi(client, chatbotSystemPrompt, [
          {
            role: 'user',
            content: contextMessage,
          },
        ]);

        const duration = Date.now() - startTime;

        // Log success (without sensitive data)
        fastify.log.info({
          userId,
          duration,
          success: true,
        }, 'Chat message processed successfully');

        return reply.send({
          message: response,
          conversationId: conversationId || null,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;

        fastify.log.error({
          userId,
          duration,
          error: error.message,
        }, 'Chat message processing failed');

        if (error.name === 'ZodError') {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: error.errors.map((e: any) => e.message).join(', '),
          });
        }

        if (error.message?.includes('Decryption failed')) {
          return reply.code(500).send({
            statusCode: 500,
            error: 'Encryption Error',
            message: 'Failed to decrypt API key. Please update your API key in Settings.',
          });
        }

        if (error.message?.includes('No content in OpenAI response')) {
          return reply.code(500).send({
            statusCode: 500,
            error: 'AI Service Error',
            message: 'OpenAI returned an empty response. Please try again.',
          });
        }

        // OpenAI API errors
        if (error.status || error.response) {
          return reply.code(500).send({
            statusCode: 500,
            error: 'AI Service Error',
            message: 'Failed to process message. Please check your API key and try again.',
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to process chat message',
        });
      }
    },
  });
};

export default aiRoutes;
