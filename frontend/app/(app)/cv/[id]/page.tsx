"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toast";
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Code,
  FolderGit,
  Star,
  Plus,
  Check,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  CvDocument,
  UserWorkExperience,
  UserEducation,
  UserSkill,
  UserProject,
  UserProfile,
} from "@/lib/types";

export default function CVEditorPage() {
  const router = useRouter();
  const params = useParams();
  const cvId = params.id as string;

  const [cv, setCv] = useState<CvDocument | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'work' | 'education' | 'skills' | 'projects'>('work');

  // Library data (all available items)
  const [allWork, setAllWork] = useState<UserWorkExperience[]>([]);
  const [allEducation, setAllEducation] = useState<UserEducation[]>([]);
  const [allSkills, setAllSkills] = useState<UserSkill[]>([]);
  const [allProjects, setAllProjects] = useState<UserProject[]>([]);

  // Included item IDs (what's in this CV)
  const [includedWorkIds, setIncludedWorkIds] = useState<Set<string>>(new Set());
  const [includedEducationIds, setIncludedEducationIds] = useState<Set<string>>(new Set());
  const [includedSkillIds, setIncludedSkillIds] = useState<Set<string>>(new Set());
  const [includedProjectIds, setIncludedProjectIds] = useState<Set<string>>(new Set());

  // Fetch CV, Profile, and Library
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [cvData, profileData, workData, eduData, skillData, projectData] = await Promise.all([
          api.getCv(cvId),
          api.getProfile(),
          api.listWorkExperiences(),
          api.listEducations(),
          api.listSkills(),
          api.listProjects(),
        ]);
        
        setCv(cvData);
        setProfile(profileData);
        setAllWork(workData);
        setAllEducation(eduData);
        setAllSkills(skillData);
        setAllProjects(projectData);

        // Extract included IDs
        setIncludedWorkIds(new Set(cvData.workExperiences?.map(w => w.id) || []));
        setIncludedEducationIds(new Set(cvData.educations?.map(e => e.id) || []));
        setIncludedSkillIds(new Set(cvData.skills?.map(s => s.id) || []));
        setIncludedProjectIds(new Set(cvData.projects?.map(p => p.id) || []));
      } catch (error: any) {
        toast.error(error.message || "Failed to load CV");
        router.push('/cv');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cvId, router]);

  const refreshCv = async () => {
    try {
      const cvData = await api.getCv(cvId);
      setCv(cvData);
      setIncludedWorkIds(new Set(cvData.workExperiences?.map(w => w.id) || []));
      setIncludedEducationIds(new Set(cvData.educations?.map(e => e.id) || []));
      setIncludedSkillIds(new Set(cvData.skills?.map(s => s.id) || []));
      setIncludedProjectIds(new Set(cvData.projects?.map(p => p.id) || []));
    } catch (error: any) {
      toast.error(error.message || "Failed to refresh CV");
    }
  };

  // Toggle default
  const toggleDefault = async () => {
    if (!cv) return;
    try {
      await api.updateCv(cvId, { isDefault: !cv.isDefault });
      toast.success(cv.isDefault ? "Removed as default CV" : "Set as default CV");
      refreshCv();
    } catch (error: any) {
      toast.error(error.message || "Failed to update CV");
    }
  };

  // Toggle work experience
  const toggleWork = async (workId: string) => {
    try {
      if (includedWorkIds.has(workId)) {
        await api.removeWorkFromCv(cvId, workId);
        toast.success('Work experience removed from CV');
      } else {
        await api.addWorkToCv(cvId, { itemId: workId });
        toast.success('Work experience added to CV');
      }
      refreshCv();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update CV');
    }
  };

  // Toggle education
  const toggleEducation = async (eduId: string) => {
    try {
      if (includedEducationIds.has(eduId)) {
        await api.removeEducationFromCv(cvId, eduId);
        toast.success('Education removed from CV');
      } else {
        await api.addEducationToCv(cvId, { itemId: eduId });
        toast.success('Education added to CV');
      }
      refreshCv();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update CV');
    }
  };

  // Toggle skill
  const toggleSkill = async (skillId: string) => {
    try {
      if (includedSkillIds.has(skillId)) {
        await api.removeSkillFromCv(cvId, skillId);
        toast.success('Skill removed from CV');
      } else {
        await api.addSkillToCv(cvId, { itemId: skillId });
        toast.success('Skill added to CV');
      }
      refreshCv();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update CV');
    }
  };

  // Toggle project
  const toggleProject = async (projectId: string) => {
    try {
      if (includedProjectIds.has(projectId)) {
        await api.removeProjectFromCv(cvId, projectId);
        toast.success('Project removed from CV');
      } else {
        await api.addProjectToCv(cvId, { itemId: projectId });
        toast.success('Project added to CV');
      }
      refreshCv();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update CV');
    }
  };

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading || !cv || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/cv')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-navy-900">{cv.title}</h1>
              <p className="text-sm text-gray-600">Template: {cv.template}</p>
            </div>
          </div>
          <Button variant={cv.isDefault ? "secondary" : "ghost"} onClick={toggleDefault}>
            <Star className={`w-4 h-4 mr-2 ${cv.isDefault ? 'fill-current' : ''}`} />
            {cv.isDefault ? 'Default CV' : 'Set as Default'}
          </Button>
        </div>

        {/* Split View */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Selection Side */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-navy-900 mb-2">Select Items for CV</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Check items to include in this CV. Add new items in Settings → Experience Library.
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b">
                {[
                  { id: 'work', label: 'Work', icon: Briefcase, count: allWork.length },
                  { id: 'education', label: 'Education', icon: GraduationCap, count: allEducation.length },
                  { id: 'skills', label: 'Skills', icon: Code, count: allSkills.length },
                  { id: 'projects', label: 'Projects', icon: FolderGit, count: allProjects.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-navy-600 text-navy-900'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* Work Experience Tab */}
              {activeTab === 'work' && (
                <div className="space-y-4">
                  {allWork.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm mb-4">
                        No work experiences in your library yet
                      </p>
                      <Button variant="ghost" onClick={() => router.push('/settings?tab=library')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add in Settings
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allWork.map((work) => {
                        const isIncluded = includedWorkIds.has(work.id);
                        return (
                          <Card
                            key={work.id}
                            className={`p-4 cursor-pointer transition-all ${
                              isIncluded ? 'bg-navy-50 border-navy-300' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => toggleWork(work.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex items-center h-6">
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => {}}
                                  className="w-4 h-4"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-navy-900">{work.role}</h4>
                                <p className="text-sm text-gray-700">{work.company}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDateDisplay(work.startDate)} -{' '}
                                  {work.isCurrent ? 'Present' : formatDateDisplay(work.endDate)}
                                </p>
                              </div>
                              {isIncluded && (
                                <Check className="w-5 h-5 text-navy-600 flex-shrink-0" />
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Education Tab */}
              {activeTab === 'education' && (
                <div className="space-y-4">
                  {allEducation.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm mb-4">
                        No education entries in your library yet
                      </p>
                      <Button variant="ghost" onClick={() => router.push('/settings?tab=library')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add in Settings
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allEducation.map((edu) => {
                        const isIncluded = includedEducationIds.has(edu.id);
                        return (
                          <Card
                            key={edu.id}
                            className={`p-4 cursor-pointer transition-all ${
                              isIncluded ? 'bg-navy-50 border-navy-300' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => toggleEducation(edu.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex items-center h-6">
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => {}}
                                  className="w-4 h-4"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-navy-900">{edu.school}</h4>
                                <p className="text-sm text-gray-700">
                                  {edu.degree} {edu.field && `in ${edu.field}`}
                                </p>
                                {edu.startDate && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatDateDisplay(edu.startDate)} -{' '}
                                    {edu.endDate ? formatDateDisplay(edu.endDate) : 'Present'}
                                  </p>
                                )}
                              </div>
                              {isIncluded && (
                                <Check className="w-5 h-5 text-navy-600 flex-shrink-0" />
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Skills Tab */}
              {activeTab === 'skills' && (
                <div className="space-y-4">
                  {allSkills.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm mb-4">
                        No skills in your library yet
                      </p>
                      <Button variant="ghost" onClick={() => router.push('/settings?tab=library')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add in Settings
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {allSkills.map((skill) => {
                        const isIncluded = includedSkillIds.has(skill.id);
                        return (
                          <Card
                            key={skill.id}
                            className={`p-3 cursor-pointer transition-all ${
                              isIncluded ? 'bg-navy-50 border-navy-300' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => toggleSkill(skill.id)}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isIncluded}
                                onChange={() => {}}
                                className="w-4 h-4"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-navy-900 truncate">{skill.name}</p>
                                {skill.level && (
                                  <p className="text-xs text-gray-500">{skill.level}</p>
                                )}
                              </div>
                              {isIncluded && (
                                <Check className="w-4 h-4 text-navy-600 flex-shrink-0" />
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Projects Tab */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  {allProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm mb-4">
                        No projects in your library yet
                      </p>
                      <Button variant="ghost" onClick={() => router.push('/settings?tab=library')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add in Settings
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allProjects.map((project) => {
                        const isIncluded = includedProjectIds.has(project.id);
                        return (
                          <Card
                            key={project.id}
                            className={`p-4 cursor-pointer transition-all ${
                              isIncluded ? 'bg-navy-50 border-navy-300' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => toggleProject(project.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex items-center h-6">
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => {}}
                                  className="w-4 h-4"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-navy-900">{project.name}</h4>
                                {project.description && (
                                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                    {project.description}
                                  </p>
                                )}
                                {project.tech.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {project.tech.slice(0, 4).map((tech, i) => (
                                      <span
                                        key={i}
                                        className="text-xs bg-navy-100 text-navy-700 px-2 py-1 rounded"
                                      >
                                        {tech}
                                      </span>
                                    ))}
                                    {project.tech.length > 4 && (
                                      <span className="text-xs text-gray-500">
                                        +{project.tech.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isIncluded && (
                                <Check className="w-5 h-5 text-navy-600 flex-shrink-0" />
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Preview Side */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <CVPreview cv={cv} profile={profile} />
          </div>
        </div>
      </div>
    </>
  );
}

// CV Preview Component (Template v1: Clean Navy)
function CVPreview({ cv, profile }: { cv: CvDocument; profile: UserProfile }) {
  const fullName = profile.firstName && profile.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile.email;

  const apiUrl = process.env.NEXT_PUBLIC_GGJ_API_URL || 'http://localhost:3000';
  const imageUrl = profile.profilePictureUrl ? `${apiUrl}${profile.profilePictureUrl}` : null;
  
  // Debug logging
  console.log('CV Preview Debug:', {
    hasProfilePictureUrl: !!profile.profilePictureUrl,
    profilePictureUrl: profile.profilePictureUrl,
    apiUrl,
    fullImageUrl: imageUrl,
    profile: profile
  });

  return (
    <Card className="p-8 bg-white shadow-lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b-2 border-navy-700 pb-4">
          <div className="flex items-start gap-6">
            {/* Profile Picture */}
            {imageUrl && (
              <div className="flex-shrink-0" style={{ width: '96px', height: '96px' }}>
                <img
                  src={imageUrl}
                  alt={fullName}
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #1e3a5f',
                    display: 'block'
                  }}
                  onError={(e) => {
                    console.error('❌ Image failed to load!');
                    console.error('URL:', e.currentTarget.src);
                    console.error('Profile picture path:', profile.profilePictureUrl);
                    console.error('Check: 1) Was picture uploaded? 2) Is backend serving /uploads? 3) CORS?');
                  }}
                  onLoad={() => {
                    console.log('✅ Profile picture loaded successfully:', imageUrl);
                  }}
                />
              </div>
            )}

            {/* Text Content */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{fullName}</h1>
              {profile.headline && (
                <p className="text-lg text-gray-800 mb-2 font-medium">{profile.headline}</p>
              )}
              <div className="text-sm text-gray-900 space-y-1">
                {profile.location && <p>{profile.location}</p>}
                {profile.phone && <p>{profile.phone}</p>}
                <p>{profile.email}</p>
                {profile.websiteUrl && (
                  <p className="text-blue-700 hover:text-blue-800 font-semibold">{profile.websiteUrl}</p>
                )}
            {profile.linkedinUrl && (
              <p className="text-blue-700 hover:text-blue-800 font-semibold">{profile.linkedinUrl}</p>
            )}
                {profile.githubUrl && (
                  <p className="text-blue-700 hover:text-blue-800 font-semibold">{profile.githubUrl}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {profile.summary && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Professional Summary
            </h2>
            <p className="text-gray-900 text-sm leading-relaxed">{profile.summary}</p>
          </div>
        )}

        {/* Work Experience */}
        {cv.workExperiences && cv.workExperiences.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Work Experience
            </h2>
            <div className="space-y-4">
              {cv.workExperiences.map((work) => (
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
                        : new Date(work.endDate!).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
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
        {cv.projects && cv.projects.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Projects
            </h2>
            <div className="space-y-3">
              {cv.projects.map((project) => (
                <div key={project.id}>
                  <h3 className="text-base font-semibold text-gray-800">{project.name}</h3>
                  {project.link && (
                    <p className="text-xs text-blue-700 font-medium">{project.link}</p>
                  )}
                  {project.description && (
                    <p className="text-sm text-gray-900 mt-1">{project.description}</p>
                  )}
                  {project.tech.length > 0 && (
                    <p className="text-xs text-gray-800 mt-1">
                      <span className="font-semibold">Technologies:</span> {project.tech.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {cv.skills && cv.skills.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {cv.skills.map((skill) => (
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
        {cv.educations && cv.educations.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3 border-b-2 border-navy-300 pb-1">
              Education
            </h2>
            <div className="space-y-3">
              {cv.educations.map((edu) => (
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
