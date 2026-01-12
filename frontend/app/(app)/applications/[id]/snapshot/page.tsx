"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import type { CvSnapshot } from "@/lib/types";

export default function SnapshotViewPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;

  const [snapshot, setSnapshot] = useState<CvSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const data = await api.getApplicationSnapshot(applicationId);
        setSnapshot(data);
      } catch (error: any) {
        toast.error(error.message || "Failed to load CV snapshot");
        router.push(`/applications/${applicationId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, [applicationId, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No snapshot found for this application.</p>
          <Link href={`/applications/${applicationId}`}>
            <Button className="mt-4">Back to Application</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/applications/${applicationId}`}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">CV Snapshot</h1>
            <p className="text-sm text-gray-600">{snapshot.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default" className="bg-navy-100 text-navy-800 px-4 py-2">
            📸 Snapshot
          </Badge>
          <Badge variant="default" className="bg-gray-100 text-gray-700">
            {new Date(snapshot.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Badge>
        </div>
      </div>

      {/* Immutability Notice */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Immutable Snapshot</h3>
            <p className="text-sm text-blue-800">
              This is a frozen copy of your CV at the time of application. 
              It will remain unchanged even if you update your profile or experience library.
            </p>
          </div>
        </div>
      </div>

      {/* Snapshot Preview */}
      <div className="max-w-4xl mx-auto">
        <SnapshotPreview snapshot={snapshot} />
      </div>
    </div>
  );
}

// Snapshot Preview Component (same styling as CV preview)
function SnapshotPreview({ snapshot }: { snapshot: CvSnapshot }) {
  const header = snapshot.header;
  const fullName = header && header.firstName && header.lastName
    ? `${header.firstName} ${header.lastName}`
    : header?.email || '';
  const apiUrl = process.env.NEXT_PUBLIC_GGJ_API_URL || 'http://localhost:3000';
  const imageUrl = header?.profilePictureUrl ? `${apiUrl}${header.profilePictureUrl}` : null;

  console.log('Snapshot Preview Debug:', {
    hasHeader: !!header,
    hasProfilePictureUrl: !!header?.profilePictureUrl,
    profilePictureUrl: header?.profilePictureUrl,
    apiUrl,
    fullImageUrl: imageUrl
  });

  return (
    <Card className="p-8 bg-white shadow-lg">
      <div className="space-y-6">
        {/* Header */}
        {header && (
          <div className="border-b-2 border-navy-700 pb-4">
            <div className="flex items-start gap-6">
              {/* Profile Picture */}
              {imageUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={imageUrl}
                    alt={fullName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-navy-700"
                    onError={(e) => {
                      console.error('❌ Snapshot image failed to load!');
                      console.error('URL:', e.currentTarget.src);
                    }}
                    onLoad={() => {
                      console.log('✅ Snapshot profile picture loaded:', imageUrl);
                    }}
                  />
                </div>
              )}

              {/* Text Content */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{fullName}</h1>
                {header.headline && (
                  <p className="text-lg text-gray-800 mb-2 font-medium">{header.headline}</p>
                )}
                <div className="text-sm text-gray-900 space-y-1">
                  {header.location && <p>{header.location}</p>}
                  {header.phone && <p>{header.phone}</p>}
                  <p>{header.email}</p>
                  {header.websiteUrl && (
                    <p className="text-blue-700 font-semibold">{header.websiteUrl}</p>
                  )}
                  {header.linkedinUrl && (
                    <p className="text-blue-700 font-semibold">{header.linkedinUrl}</p>
                  )}
                  {header.githubUrl && (
                    <p className="text-blue-700 font-semibold">{header.githubUrl}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {header?.summary && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Professional Summary
            </h2>
            <p className="text-gray-900 text-sm leading-relaxed">{header.summary}</p>
          </div>
        )}

        {/* Work Experience */}
        {snapshot.workExperiences.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Work Experience
            </h2>
            <div className="space-y-4">
              {snapshot.workExperiences.map((work) => (
                <div key={work.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-base font-semibold text-gray-800">{work.role}</h3>
                    <span className="text-xs text-gray-800 font-semibold">
                      {new Date(work.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      -{' '}
                      {work.isCurrent
                        ? 'Present'
                        : work.endDate ? new Date(work.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          }) : ''}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{work.company}</p>
                  {work.location && (
                    <p className="text-xs text-gray-800">{work.location}</p>
                  )}
                  {work.description && (
                    <p className="text-sm text-gray-900 mt-2 leading-relaxed">
                      {work.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {snapshot.projects.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Projects
            </h2>
            <div className="space-y-3">
              {snapshot.projects.map((project) => (
                <div key={project.id}>
                  <h3 className="text-base font-semibold text-gray-800">{project.name}</h3>
                  {project.link && (
                    <p className="text-xs text-blue-700 font-medium">{project.link}</p>
                  )}
                  {project.description && (
                    <p className="text-sm text-gray-900 mt-1">{project.description}</p>
                  )}
                  {project.tech.length > 0 && (
                    <p className="text-xs text-gray-700 mt-1">
                      <span className="font-semibold">Technologies:</span> {project.tech.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {snapshot.skills.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {snapshot.skills.map((skill) => (
                <span
                  key={skill.id}
                  className="text-sm bg-navy-50 text-gray-800 border border-navy-200 px-3 py-1 rounded-full"
                >
                  {skill.name}
                  {skill.level && <span className="text-gray-800"> • {skill.level}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {snapshot.educations.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Education
            </h2>
            <div className="space-y-3">
              {snapshot.educations.map((edu) => (
                <div key={edu.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-base font-semibold text-gray-800">{edu.school}</h3>
                    {edu.startDate && (
                      <span className="text-xs text-gray-800 font-semibold">
                        {new Date(edu.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        -{' '}
                        {edu.endDate
                          ? new Date(edu.endDate).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Present'}
                      </span>
                    )}
                  </div>
                  {edu.degree && (
                    <p className="text-sm text-gray-900 font-semibold">
                      {edu.degree}
                      {edu.field && ` in ${edu.field}`}
                    </p>
                  )}
                  {edu.description && (
                    <p className="text-sm text-gray-900 mt-1">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
