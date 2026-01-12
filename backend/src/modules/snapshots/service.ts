import { FastifyInstance } from 'fastify';

/**
 * Create an immutable CV snapshot from a CV document
 * Copies all data (profile + CV sections) at the current point in time
 */
export async function createSnapshotFromCv(
  fastify: FastifyInstance,
  userId: string,
  cvDocumentId: string,
  applicationId?: string
): Promise<string> {
  return await fastify.prisma.$transaction(async (tx) => {
    // 1. Verify CV document belongs to user
    const cvDocument = await tx.cvDocument.findFirst({
      where: {
        id: cvDocumentId,
        userId,
      },
      include: {
        workInclusions: {
          include: {
            workExperience: true,
          },
          orderBy: { order: 'asc' },
        },
        educationInclusions: {
          include: {
            education: true,
          },
          orderBy: { order: 'asc' },
        },
        skillInclusions: {
          include: {
            skill: true,
          },
          orderBy: { order: 'asc' },
        },
        projectInclusions: {
          include: {
            project: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!cvDocument) {
      throw new Error('CV document not found or does not belong to user');
    }

    // 2. Verify application belongs to user if provided
    if (applicationId) {
      const application = await tx.jobApplication.findFirst({
        where: {
          id: applicationId,
          userId,
        },
      });

      if (!application) {
        throw new Error('Application not found or does not belong to user');
      }

      // 3. Delete old snapshot if it exists for this application
      const existingSnapshot = await tx.cvSnapshot.findFirst({
        where: { applicationId },
      });

      if (existingSnapshot) {
        // Cascade will handle deletion of related records
        await tx.cvSnapshot.delete({
          where: { id: existingSnapshot.id },
        });
      }
    }

    // 4. Fetch user profile data
    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 5. Create the snapshot
    const snapshot = await tx.cvSnapshot.create({
      data: {
        userId,
        cvDocumentId,
        applicationId,
        title: applicationId
          ? `Snapshot for ${cvDocument.title}`
          : cvDocument.title,
        template: cvDocument.template,
      },
    });

    // 6. Create snapshot header (profile data)
    await tx.cvSnapshotHeader.create({
      data: {
        snapshotId: snapshot.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        location: user.location,
        headline: user.headline,
        summary: user.summary,
        profilePictureUrl: user.profilePictureUrl,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        websiteUrl: user.websiteUrl,
      },
    });

    // 7. Copy work experiences
    const workExperiencePromises = cvDocument.workInclusions.map((inclusion) =>
      tx.cvSnapshotWorkExperience.create({
        data: {
          snapshotId: snapshot.id,
          company: inclusion.workExperience.company,
          role: inclusion.workExperience.role,
          location: inclusion.workExperience.location,
          startDate: inclusion.workExperience.startDate,
          endDate: inclusion.workExperience.endDate,
          isCurrent: inclusion.workExperience.isCurrent,
          description: inclusion.workExperience.description,
          order: inclusion.order,
        },
      })
    );

    // 8. Copy educations
    const educationPromises = cvDocument.educationInclusions.map((inclusion) =>
      tx.cvSnapshotEducation.create({
        data: {
          snapshotId: snapshot.id,
          school: inclusion.education.school,
          degree: inclusion.education.degree,
          field: inclusion.education.field,
          startDate: inclusion.education.startDate,
          endDate: inclusion.education.endDate,
          description: inclusion.education.description,
          order: inclusion.order,
        },
      })
    );

    // 9. Copy skills
    const skillPromises = cvDocument.skillInclusions.map((inclusion) =>
      tx.cvSnapshotSkill.create({
        data: {
          snapshotId: snapshot.id,
          name: inclusion.skill.name,
          level: inclusion.skill.level,
          category: inclusion.skill.category,
          order: inclusion.order,
        },
      })
    );

    // 10. Copy projects
    const projectPromises = cvDocument.projectInclusions.map((inclusion) =>
      tx.cvSnapshotProject.create({
        data: {
          snapshotId: snapshot.id,
          name: inclusion.project.name,
          description: inclusion.project.description,
          link: inclusion.project.link,
          tech: inclusion.project.tech,
          order: inclusion.order,
        },
      })
    );

    // Execute all copies in parallel
    await Promise.all([
      ...workExperiencePromises,
      ...educationPromises,
      ...skillPromises,
      ...projectPromises,
    ]);

    return snapshot.id;
  });
}

/**
 * Get a snapshot with all its data
 */
export async function getSnapshot(
  fastify: FastifyInstance,
  snapshotId: string,
  userId: string
) {
  const snapshot = await fastify.prisma.cvSnapshot.findFirst({
    where: {
      id: snapshotId,
      userId,
    },
    include: {
      header: true,
      workExperiences: {
        orderBy: { order: 'asc' },
      },
      educations: {
        orderBy: { order: 'asc' },
      },
      skills: {
        orderBy: { order: 'asc' },
      },
      projects: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!snapshot) {
    throw new Error('Snapshot not found or does not belong to user');
  }

  return snapshot;
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(
  fastify: FastifyInstance,
  snapshotId: string,
  userId: string
) {
  const snapshot = await fastify.prisma.cvSnapshot.findFirst({
    where: {
      id: snapshotId,
      userId,
    },
  });

  if (!snapshot) {
    throw new Error('Snapshot not found or does not belong to user');
  }

  await fastify.prisma.cvSnapshot.delete({
    where: { id: snapshotId },
  });
}
