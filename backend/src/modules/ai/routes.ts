import { FastifyPluginAsync } from 'fastify';
import {
  optimizeCvSchema,
  chatMessageSchema,
  suggestCvSchema,
  applyCvSuggestionSchema,
  aiCvSuggestionSchema,
} from './schemas.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getOpenAiClient, generateCvSummary, chatWithAi, generateCvSuggestion } from '../../services/openaiClient.js';
import { cvSuggestResponseJsonSchema, cvSuggestResponseZodSchema } from '../../ai/schemas/cvSuggest.schema.js';
import { ok, fail } from '../../utils/httpResponse.js';

// Load system prompts (relative to backend root)
const systemPromptPath = join(process.cwd(), 'src/ai/prompts/cv_optimize.system.md');
const systemPrompt = readFileSync(systemPromptPath, 'utf-8');

const chatbotPromptPath = join(process.cwd(), 'src/ai/prompts/chatbot.system.md');
const chatbotSystemPrompt = readFileSync(chatbotPromptPath, 'utf-8');

const cvSuggestPromptPath = join(process.cwd(), 'src/ai/prompts/cv_suggest.system.md');
const cvSuggestSystemPrompt = readFileSync(cvSuggestPromptPath, 'utf-8');

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  // CV Suggest endpoint: generate summary + suggested library IDs (no changes applied yet)
  fastify.post('/ai/cv/suggest', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;
      try {
        const body = suggestCvSchema.parse(request.body);

        // Verify CV belongs to user
        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: body.cvId, userId },
          select: { id: true, title: true, template: true, overrideSummary: true, canvasState: true },
        });
        if (!cv) {
          return fail(reply, 404, 'CV not found', 'NotFound');
        }

        const openaiKey = await fastify.prisma.openAiKey.findUnique({ where: { userId } });
        if (!openaiKey) {
          return fail(
            reply,
            400,
            'No OpenAI API key saved. Add it in Settings → API Settings.',
            'OpenAiKeyNotSet'
          );
        }

        // Load profile + full library + current inclusions (IDs)
        const [profile, work, education, skills, projects, workInc, eduInc, skillInc, projInc] =
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
            fastify.prisma.userWorkExperience.findMany({ where: { userId }, orderBy: { startDate: 'desc' } }),
            fastify.prisma.userEducation.findMany({ where: { userId }, orderBy: { startDate: 'desc' } }),
            fastify.prisma.userSkill.findMany({ where: { userId } }),
            fastify.prisma.userProject.findMany({ where: { userId } }),
            fastify.prisma.cvWorkInclusion.findMany({ where: { cvId: body.cvId }, select: { workExperienceId: true, order: true }, orderBy: { order: 'asc' } }),
            fastify.prisma.cvEducationInclusion.findMany({ where: { cvId: body.cvId }, select: { educationId: true, order: true }, orderBy: { order: 'asc' } }),
            fastify.prisma.cvSkillInclusion.findMany({ where: { cvId: body.cvId }, select: { skillId: true, order: true }, orderBy: { order: 'asc' } }),
            fastify.prisma.cvProjectInclusion.findMany({ where: { cvId: body.cvId }, select: { projectId: true, order: true }, orderBy: { order: 'asc' } }),
          ]);

        if (!profile) {
          return fail(reply, 404, 'Profile not found', 'NotFound');
        }

        const inputPayload = {
          jobPostingText: body.jobPosting,
          mode: body.mode ?? 'replace',
          profile,
          cv: { id: cv.id, title: cv.title, template: cv.template },
          library: {
            work: work.map((w) => ({ id: w.id, company: w.company, role: w.role, location: w.location, startDate: w.startDate, endDate: w.endDate, isCurrent: w.isCurrent, description: w.description })),
            education: education.map((e) => ({ id: e.id, school: e.school, degree: e.degree, field: e.field, startDate: e.startDate, endDate: e.endDate, description: e.description })),
            skills: skills.map((s) => ({ id: s.id, name: s.name, level: s.level, category: s.category })),
            projects: projects.map((p) => ({ id: p.id, name: p.name, description: p.description, link: p.link, tech: p.tech })),
          },
          currentIncluded: {
            workIds: workInc.map((x) => x.workExperienceId),
            educationIds: eduInc.map((x) => x.educationId),
            skillIds: skillInc.map((x) => x.skillId),
            projectIds: projInc.map((x) => x.projectId),
          },
        };

        const client = await getOpenAiClient({
          keyCiphertext: openaiKey.keyCiphertext,
          keyIv: openaiKey.keyIv,
          keyTag: openaiKey.keyTag,
        });

        // Structured output + server validation (retry once if invalid)
        let parsed: any;
        try {
          parsed = await generateCvSuggestion(client, cvSuggestSystemPrompt, JSON.stringify(inputPayload), cvSuggestResponseJsonSchema);
          parsed = cvSuggestResponseZodSchema.parse(parsed);
        } catch (firstErr: any) {
          parsed = await generateCvSuggestion(
            client,
            cvSuggestSystemPrompt + '\n\nIMPORTANT: Output MUST match schema exactly. No extra keys.',
            JSON.stringify(inputPayload),
            cvSuggestResponseJsonSchema
          );
          parsed = cvSuggestResponseZodSchema.parse(parsed);
        }

        // Also validate caps/dupes via our API schema (adds defaults)
        const suggestion = aiCvSuggestionSchema.parse(parsed);

        return ok(reply, { suggestion });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }
        return fail(reply, 500, 'Failed to generate suggestions. Please try again.', 'AiServiceError');
      }
    },
  });

  // CV Apply endpoint: apply suggestion atomically (summary + inclusions)
  fastify.post('/ai/cv/apply', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;
      try {
        const body = applyCvSuggestionSchema.parse(request.body);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: body.cvId, userId },
          select: { id: true, canvasState: true },
        });
        if (!cv) {
          return fail(reply, 404, 'CV not found', 'NotFound');
        }

        const suggestion = aiCvSuggestionSchema.parse(body.suggestion);
        const replace = body.replaceSelection ?? true;

        // Ownership checks: all IDs must belong to user
        const [workCount, projCount, skillCount, eduCount] = await Promise.all([
          fastify.prisma.userWorkExperience.count({ where: { userId, id: { in: suggestion.selections.workIds } } }),
          fastify.prisma.userProject.count({ where: { userId, id: { in: suggestion.selections.projectIds } } }),
          fastify.prisma.userSkill.count({ where: { userId, id: { in: suggestion.selections.skillIds } } }),
          fastify.prisma.userEducation.count({ where: { userId, id: { in: suggestion.selections.educationIds } } }),
        ]);
        if (workCount !== suggestion.selections.workIds.length ||
            projCount !== suggestion.selections.projectIds.length ||
            skillCount !== suggestion.selections.skillIds.length ||
            eduCount !== suggestion.selections.educationIds.length) {
          return fail(reply, 400, 'One or more suggested IDs are invalid or not owned by user.', 'BadRequest');
        }

        await fastify.prisma.$transaction(async (tx) => {
          // Update summary: always store overrideSummary. If canvasState exists, also update SUMMARY block.
          let nextCanvasState: any = cv.canvasState;
          if (nextCanvasState && typeof nextCanvasState === 'object' && Array.isArray((nextCanvasState as any).blocks)) {
            nextCanvasState = {
              ...(nextCanvasState as any),
              blocks: (nextCanvasState as any).blocks.map((b: any) =>
                b?.type === 'SUMMARY' || b?.id === 'summary'
                  ? { ...b, content: { ...(b.content || {}), text: suggestion.summary } }
                  : b
              ),
            };
          }

          await tx.cvDocument.update({
            where: { id: body.cvId },
            data: {
              overrideSummary: suggestion.summary.trim(),
              canvasState: nextCanvasState ?? undefined,
            },
          });

          // Inclusions
          if (replace) {
            await Promise.all([
              tx.cvWorkInclusion.deleteMany({ where: { cvId: body.cvId } }),
              tx.cvProjectInclusion.deleteMany({ where: { cvId: body.cvId } }),
              tx.cvSkillInclusion.deleteMany({ where: { cvId: body.cvId } }),
              tx.cvEducationInclusion.deleteMany({ where: { cvId: body.cvId } }),
            ]);
          }

          // Add/update with order from arrays
          await Promise.all([
            Promise.all(
              suggestion.selections.workIds.map((id, order) =>
                tx.cvWorkInclusion.upsert({
                  where: { cvId_workExperienceId: { cvId: body.cvId, workExperienceId: id } } as any,
                  create: { cvId: body.cvId, workExperienceId: id, order },
                  update: { order },
                })
              )
            ),
            Promise.all(
              suggestion.selections.projectIds.map((id, order) =>
                tx.cvProjectInclusion.upsert({
                  where: { cvId_projectId: { cvId: body.cvId, projectId: id } } as any,
                  create: { cvId: body.cvId, projectId: id, order },
                  update: { order },
                })
              )
            ),
            Promise.all(
              suggestion.selections.skillIds.map((id, order) =>
                tx.cvSkillInclusion.upsert({
                  where: { cvId_skillId: { cvId: body.cvId, skillId: id } } as any,
                  create: { cvId: body.cvId, skillId: id, order },
                  update: { order },
                })
              )
            ),
            Promise.all(
              suggestion.selections.educationIds.map((id, order) =>
                tx.cvEducationInclusion.upsert({
                  where: { cvId_educationId: { cvId: body.cvId, educationId: id } } as any,
                  create: { cvId: body.cvId, educationId: id, order },
                  update: { order },
                })
              )
            ),
          ]);
        });

        return ok(reply, { ok: true });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }
        return fail(reply, 500, 'Failed to apply suggestions', 'InternalServerError');
      }
    },
  });

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
          return fail(reply, 404, 'CV document not found', 'NotFound');
        }

        // Check if user has OpenAI key
        const openaiKey = await fastify.prisma.openAiKey.findUnique({
          where: { userId },
        });

        if (!openaiKey) {
          return fail(
            reply,
            400,
            'No OpenAI API key saved. Add it in Settings → API Settings.',
            'OpenAiKeyNotSet'
          );
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
          return fail(reply, 404, 'User profile not found', 'NotFound');
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

        return ok(
          reply,
          {
            cvId,
            summary: result.summary,
            keySkills: result.keySkills,
            roleFitBullets: result.roleFitBullets,
          },
          'AI summary generated'
        );
      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Log error (without sensitive data)
        fastify.log.error({
          userId,
          duration,
          error: error.message,
        }, 'CV summary generation failed');

        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }

        if (error.message?.includes('Decryption failed')) {
          return fail(
            reply,
            500,
            'Failed to decrypt API key. Please update your API key in Settings.',
            'EncryptionError'
          );
        }

        if (error.message?.includes('No content in OpenAI response')) {
          return fail(reply, 500, 'OpenAI returned an empty response. Please try again.', 'AiServiceError');
        }

        // OpenAI API errors
        if (error.status || error.response) {
          return fail(
            reply,
            500,
            'Failed to generate summary. Please check your API key and try again.',
            'AiServiceError'
          );
        }

        fastify.log.error(error);
        return fail(reply, 500, 'Failed to generate CV summary', 'InternalServerError');
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
          return fail(
            reply,
            400,
            'No OpenAI API key saved. Add it in Settings → API Settings.',
            'OpenAiKeyNotSet'
          );
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
          return fail(reply, 404, 'User profile not found', 'NotFound');
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

        return ok(reply, { message: response, conversationId: conversationId || null });
      } catch (error: any) {
        const duration = Date.now() - startTime;

        fastify.log.error({
          userId,
          duration,
          error: error.message,
        }, 'Chat message processing failed');

        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }

        if (error.message?.includes('Decryption failed')) {
          return fail(
            reply,
            500,
            'Failed to decrypt API key. Please update your API key in Settings.',
            'EncryptionError'
          );
        }

        if (error.message?.includes('No content in OpenAI response')) {
          return fail(reply, 500, 'OpenAI returned an empty response. Please try again.', 'AiServiceError');
        }

        // OpenAI API errors
        if (error.status || error.response) {
          return fail(
            reply,
            500,
            'Failed to process message. Please check your API key and try again.',
            'AiServiceError'
          );
        }

        fastify.log.error(error);
        return fail(reply, 500, 'Failed to process chat message', 'InternalServerError');
      }
    },
  });
};

export default aiRoutes;
