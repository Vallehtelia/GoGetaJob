"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toast";
import { api } from "@/lib/api";
import type {
  UserProfile,
  UpdateProfileInput,
  UserWorkExperience,
  UserEducation,
  UserSkill,
  UserProject,
  CreateWorkExperienceInput,
  CreateEducationInput,
  CreateSkillInput,
  CreateProjectInput,
  CvSkillLevel,
} from "@/lib/types";
import {
  Loader2,
  User,
  Settings as SettingsIcon,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";

const SKILL_LEVELS: CvSkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "library" | "api">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OpenAI state
  const [openaiStatus, setOpenaiStatus] = useState<{ hasKey: boolean; last4: string | null; updatedAt: string | null } | null>(null);
  const [openaiKey, setOpenaiKey] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [loadingOpenai, setLoadingOpenai] = useState(false);

  // Library state
  const [workExperiences, setWorkExperiences] = useState<UserWorkExperience[]>([]);
  const [educations, setEducations] = useState<UserEducation[]>([]);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [libraryTab, setLibraryTab] = useState<'work' | 'education' | 'skills' | 'projects'>('work');

  // Modals
  const [workModal, setWorkModal] = useState<{ mode: 'create' | 'edit'; data?: UserWorkExperience } | null>(null);
  const [educationModal, setEducationModal] = useState<{ mode: 'create' | 'edit'; data?: UserEducation } | null>(null);
  const [skillModal, setSkillModal] = useState<{ mode: 'create' | 'edit'; data?: UserSkill } | null>(null);
  const [projectModal, setProjectModal] = useState<{ mode: 'create' | 'edit'; data?: UserProject } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'work' | 'education' | 'skill' | 'project';
    id: string;
    name: string;
  } | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Load library when library tab is active
  useEffect(() => {
    if (activeTab === 'library') {
      loadLibrary();
    }
  }, [activeTab]);

  // Load OpenAI status when API tab is active
  useEffect(() => {
    if (activeTab === 'api') {
      loadOpenAiStatus();
    }
  }, [activeTab]);

  const loadOpenAiStatus = async () => {
    try {
      setLoadingOpenai(true);
      const status = await api.getOpenAiKeyStatus();
      setOpenaiStatus(status);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load OpenAI key status');
    } finally {
      setLoadingOpenai(false);
    }
  };

  const handleSaveOpenAiKey = async () => {
    if (!openaiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    try {
      setSaving(true);
      const response = await api.setOpenAiKey(openaiKey);
      setOpenaiStatus({ hasKey: true, last4: response.last4, updatedAt: new Date().toISOString() });
      setOpenaiKey(''); // Clear input
      toast.success('OpenAI API key saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOpenAiKey = async () => {
    try {
      setSaving(true);
      await api.deleteOpenAiKey();
      setOpenaiStatus({ hasKey: false, last4: null, updatedAt: null });
      toast.success('OpenAI API key deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete API key');
    } finally {
      setSaving(false);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getProfile();
      setProfile(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const [workData, eduData, skillData, projectData] = await Promise.all([
        api.listWorkExperiences(),
        api.listEducations(),
        api.listSkills(),
        api.listProjects(),
      ]);
      setWorkExperiences(workData);
      setEducations(eduData);
      setSkills(skillData);
      setProjects(projectData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    // Validate URLs
    const newErrors: Record<string, string> = {};
    
    if (profile.linkedinUrl && !validateUrl(profile.linkedinUrl)) {
      newErrors.linkedinUrl = "Invalid URL format";
    }
    if (profile.githubUrl && !validateUrl(profile.githubUrl)) {
      newErrors.githubUrl = "Invalid URL format";
    }
    if (profile.websiteUrl && !validateUrl(profile.websiteUrl)) {
      newErrors.websiteUrl = "Invalid URL format";
    }
    if (profile.summary && profile.summary.length > 2000) {
      newErrors.summary = "Summary must be 2000 characters or less";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the validation errors");
      return;
    }

    try {
      setSaving(true);
      const updates: UpdateProfileInput = {
        firstName: profile.firstName || null,
        lastName: profile.lastName || null,
        phone: profile.phone || null,
        location: profile.location || null,
        headline: profile.headline || null,
        summary: profile.summary || null,
        linkedinUrl: profile.linkedinUrl || null,
        githubUrl: profile.githubUrl || null,
        websiteUrl: profile.websiteUrl || null,
      };
      
      const updated = await api.updateProfile(updates);
      setProfile(updated);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      const { type, id } = deleteConfirm;
      switch (type) {
        case 'work':
          await api.deleteWorkExperience(id);
          break;
        case 'education':
          await api.deleteEducation(id);
          break;
        case 'skill':
          await api.deleteSkill(id);
          break;
        case 'project':
          await api.deleteProject(id);
          break;
      }
      toast.success("Deleted successfully");
      setDeleteConfirm(null);
      loadLibrary();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and experience library
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === "profile"
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4 inline mr-2" />
          Profile
          {activeTab === "profile" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("library")}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === "library"
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4 inline mr-2" />
          Experience Library
          {activeTab === "library" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("api")}
          className={`px-4 py-2 font-medium transition-colors relative ${
            activeTab === "api"
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <SettingsIcon className="h-4 w-4 inline mr-2" />
          API Settings
          {activeTab === "api" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500" />
          )}
        </button>
      </div>

      {/* Profile Tab Content */}
      {activeTab === "profile" && (
        <div className="max-w-3xl">
          {loading ? (
            <Card>
              <CardContent className="p-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </CardContent>
            </Card>
          ) : profile ? (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="space-y-3">
                  <Label>Profile Picture</Label>
                  <div className="flex items-start gap-6">
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      {profile.profilePictureUrl ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_GGJ_API_URL || 'http://localhost:3000'}${profile.profilePictureUrl}`}
                          alt="Profile"
                          className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                          <User className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <input
                          type="file"
                          id="profilePicture"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            // Validate file size (5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('File size must be less than 5MB');
                              return;
                            }

                            try {
                              setSaving(true);
                              const updatedProfile = await api.uploadProfilePicture(file);
                              setProfile(updatedProfile);
                              toast.success('Profile picture uploaded successfully');
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to upload profile picture');
                            } finally {
                              setSaving(false);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => document.getElementById('profilePicture')?.click()}
                          disabled={saving}
                        >
                          {saving ? 'Uploading...' : 'Upload Picture'}
                        </Button>
                        {profile.profilePictureUrl && (
                          <Button
                            type="button"
                            variant="danger"
                            className="ml-2"
                            onClick={async () => {
                              try {
                                setSaving(true);
                                const updatedProfile = await api.deleteProfilePicture();
                                setProfile(updatedProfile);
                                toast.success('Profile picture removed');
                              } catch (error: any) {
                                toast.error(error.message || 'Failed to remove profile picture');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or WebP. Max 5MB. Recommended: 400x400px or larger, square aspect ratio.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6" />

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName || ""}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName || ""}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location || ""}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="San Francisco, CA"
                  />
                </div>

                <div>
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={profile.headline || ""}
                    onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                    placeholder="Software Engineer | Full Stack Developer"
                    maxLength={160}
                  />
                </div>

                <div>
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={profile.summary || ""}
                    onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    maxLength={2000}
                  />
                  {errors.summary && (
                    <p className="text-sm text-red-500 mt-1">{errors.summary}</p>
                  )}
                </div>

                {/* Social Links */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-4">Social Links</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                      <Input
                        id="linkedinUrl"
                        type="url"
                        value={profile.linkedinUrl || ""}
                        onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                      {errors.linkedinUrl && (
                        <p className="text-sm text-red-500 mt-1">{errors.linkedinUrl}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="githubUrl">GitHub URL</Label>
                      <Input
                        id="githubUrl"
                        type="url"
                        value={profile.githubUrl || ""}
                        onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                        placeholder="https://github.com/yourusername"
                      />
                      {errors.githubUrl && (
                        <p className="text-sm text-red-500 mt-1">{errors.githubUrl}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="websiteUrl">Website URL</Label>
                      <Input
                        id="websiteUrl"
                        type="url"
                        value={profile.websiteUrl || ""}
                        onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })}
                        placeholder="https://yourwebsite.com"
                      />
                      {errors.websiteUrl && (
                        <p className="text-sm text-red-500 mt-1">{errors.websiteUrl}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button onClick={loadProfile} variant="ghost" disabled={saving}>
                    Reset
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {/* Experience Library Tab Content */}
      {activeTab === "library" && (
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Your Experience Library</h3>
                  <p className="text-sm text-muted-foreground">
                    Add all your work experiences, education, skills, and projects here once. 
                    Then when creating CVs, simply select which items to include. 
                    Updates here will reflect in all CVs that use these items.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Library Sub-tabs */}
          <div className="flex gap-2 mb-6 border-b">
            {[
              { id: 'work', label: 'Work Experience', icon: Briefcase },
              { id: 'education', label: 'Education', icon: BookOpen },
              { id: 'skills', label: 'Skills', icon: BookOpen },
              { id: 'projects', label: 'Projects', icon: BookOpen },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLibraryTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-all rounded-t-lg ${
                  libraryTab === tab.id
                    ? 'border-navy-600 text-navy-900 bg-navy-50'
                    : 'border-transparent text-gray-600 hover:text-navy-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-12 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Work Experience */}
              {libraryTab === 'work' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Work Experience Library</h3>
                    <Button onClick={() => setWorkModal({ mode: 'create' })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Work Experience
                    </Button>
                  </div>
                  {workExperiences.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center text-muted-foreground">
                        No work experiences yet. Add your first one!
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {workExperiences.map((work) => (
                        <Card key={work.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-navy-900">{work.role}</h4>
                              <p className="text-sm text-gray-700">{work.company}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDateDisplay(work.startDate)} -{' '}
                                {work.isCurrent ? 'Present' : formatDateDisplay(work.endDate)}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setWorkModal({ mode: 'edit', data: work })}
                                className="hover:bg-navy-100 hover:text-navy-900"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'work',
                                    id: work.id,
                                    name: `${work.role} at ${work.company}`,
                                  })
                                }
                                className="hover:bg-red-100 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Education */}
              {libraryTab === 'education' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Education Library</h3>
                    <Button onClick={() => setEducationModal({ mode: 'create' })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Education
                    </Button>
                  </div>
                  {educations.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center text-muted-foreground">
                        No education entries yet. Add your first one!
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {educations.map((edu) => (
                        <Card key={edu.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
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
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEducationModal({ mode: 'edit', data: edu })}
                                className="hover:bg-navy-100 hover:text-navy-900"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'education',
                                    id: edu.id,
                                    name: edu.school,
                                  })
                                }
                                className="hover:bg-red-100 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Skills */}
              {libraryTab === 'skills' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Skills Library</h3>
                    <Button onClick={() => setSkillModal({ mode: 'create' })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Skill
                    </Button>
                  </div>
                  {skills.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center text-muted-foreground">
                        No skills yet. Add your first one!
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {skills.map((skill) => (
                        <Card key={skill.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-navy-900 truncate">{skill.name}</p>
                              {skill.level && (
                                <p className="text-xs text-gray-500 mt-1">{skill.level}</p>
                              )}
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSkillModal({ mode: 'edit', data: skill })}
                                className="hover:bg-navy-100 hover:text-navy-900"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'skill',
                                    id: skill.id,
                                    name: skill.name,
                                  })
                                }
                                className="hover:bg-red-100 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Projects */}
              {libraryTab === 'projects' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Projects Library</h3>
                    <Button onClick={() => setProjectModal({ mode: 'create' })}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Project
                    </Button>
                  </div>
                  {projects.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center text-muted-foreground">
                        No projects yet. Add your first one!
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((project) => (
                        <Card key={project.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-navy-900">{project.name}</h4>
                              {project.description && (
                                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                  {project.description}
                                </p>
                              )}
                              {project.tech.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {project.tech.map((tech, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-navy-100 text-navy-700 px-2 py-1 rounded"
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setProjectModal({ mode: 'edit', data: project })}
                                className="hover:bg-navy-100 hover:text-navy-900"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'project',
                                    id: project.id,
                                    name: project.name,
                                  })
                                }
                                className="hover:bg-red-100 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* API Tab Content */}
      {activeTab === "api" && (
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI (OpenAI) Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingOpenai ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : (
                <>
                  {/* Status Display */}
                  <div className="space-y-2">
                    <Label>OpenAI API Key Status</Label>
                    {openaiStatus?.hasKey ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-900">
                              ✓ API Key Saved
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Ends with: ****{openaiStatus.last4}
                            </p>
                            {openaiStatus.updatedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Last updated: {new Date(openaiStatus.updatedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600">No API key saved</p>
                      </div>
                    )}
                  </div>

                  {/* Security Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 font-medium mb-2">
                      🔒 Security Notice
                    </p>
                    <p className="text-xs text-blue-800">
                      Your API key is stored encrypted on the server and never exposed to your browser. 
                      We never log or display your full API key.
                    </p>
                  </div>

                  {/* Input Section */}
                  <div className="space-y-3">
                    <Label htmlFor="openaiKey">
                      {openaiStatus?.hasKey ? 'Replace API Key' : 'OpenAI API Key'}
                    </Label>
                    <Input
                      id="openaiKey"
                      type="password"
                      placeholder="sk-proj-..."
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your OpenAI API key (starts with &ldquo;sk-&rdquo; or &ldquo;sk-proj-&rdquo;)
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveOpenAiKey}
                      disabled={saving || !openaiKey.trim()}
                    >
                      {saving ? 'Saving...' : openaiStatus?.hasKey ? 'Update Key' : 'Save Key'}
                    </Button>
                    
                    {openaiStatus?.hasKey && (
                      <Button
                        variant="danger"
                        onClick={handleDeleteOpenAiKey}
                        disabled={saving}
                      >
                        Delete Key
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      onClick={() => setShowHelpModal(true)}
                    >
                      Help
                    </Button>
                  </div>

                  {/* Future Setup Notice */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900 font-medium mb-2">
                      ℹ️ Future Setup (Recommended)
                    </p>
                    <p className="text-xs text-yellow-800">
                      Currently, this is for future AI features. When implemented, all OpenAI calls
                      will be made from the server using your encrypted key—never from your browser.
                      This keeps your API key secure.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Work Modal */}
      {workModal && (
        <WorkExperienceModal
          mode={workModal.mode}
          data={workModal.data}
          onClose={() => setWorkModal(null)}
          onSave={() => {
            setWorkModal(null);
            loadLibrary();
          }}
        />
      )}

      {/* Education Modal */}
      {educationModal && (
        <EducationModal
          mode={educationModal.mode}
          data={educationModal.data}
          onClose={() => setEducationModal(null)}
          onSave={() => {
            setEducationModal(null);
            loadLibrary();
          }}
        />
      )}

      {/* Skill Modal */}
      {skillModal && (
        <SkillModal
          mode={skillModal.mode}
          data={skillModal.data}
          onClose={() => setSkillModal(null)}
          onSave={() => {
            setSkillModal(null);
            loadLibrary();
          }}
        />
      )}

      {/* Project Modal */}
      {projectModal && (
        <ProjectModal
          mode={projectModal.mode}
          data={projectModal.data}
          onClose={() => setProjectModal(null)}
          onSave={() => {
            setProjectModal(null);
            loadLibrary();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title={`Delete ${deleteConfirm.type}`}
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This will also remove it from all CVs that use it.`}
          confirmLabel="Delete"
          isDestructive={true}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* OpenAI Help Modal */}
      {showHelpModal && (
        <OpenAiHelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}

// OpenAI Help Modal Component
function OpenAiHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title="How to create an OpenAI API key">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Steps */}
        <div className="space-y-3">
          <h3 className="font-semibold text-navy-900">Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Log in to OpenAI Developer Platform</li>
            <li>Open your Project (or create one)</li>
            <li>Go to Project settings → API Keys</li>
            <li>Click &ldquo;Create new secret key&rdquo;</li>
            <li>Copy the key immediately (it is shown once) and store it somewhere safe</li>
            <li>(Optional) Set key permissions (All / Restricted / Read-only) depending on your needs</li>
            <li>Paste the key into GoGet-a-Job → Settings → AI (OpenAI) and click Save</li>
          </ol>
        </div>

        {/* Links */}
        <div className="space-y-2">
          <h3 className="font-semibold text-navy-900">Helpful Links:</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://platform.openai.com/settings/organization/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                API keys page →
              </a>
            </li>
            <li>
              <a
                href="https://platform.openai.com/docs/quickstart"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Quickstart guide →
              </a>
            </li>
            <li>
              <a
                href="https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                API key safety best practices →
              </a>
            </li>
            <li>
              <a
                href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Where to find API key →
              </a>
            </li>
            <li>
              <a
                href="https://help.openai.com/en/articles/9186755-managing-your-work-in-the-api-platform-with-projects"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Managing projects & API keys →
              </a>
            </li>
            <li>
              <a
                href="https://help.openai.com/en/articles/8867743-assign-api-key-permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Assign key permissions →
              </a>
            </li>
          </ul>
        </div>

        {/* Security Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-900 mb-2">
            ⚠️ Never share your API key
          </p>
          <p className="text-xs text-red-800">
            GoGet-a-Job stores it encrypted on the server and never exposes it to the browser. 
            Keep your key secret and never commit it to version control or share it publicly.
          </p>
        </div>

        {/* Future Implementation Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            Future Setup (Recommended)
          </p>
          <p className="text-xs text-blue-800 mb-2">
              Do NOT call OpenAI directly from the frontend. Instead, create backend &ldquo;AI endpoints&rdquo; 
            that use the encrypted OpenAI key stored server-side.
          </p>
          <p className="text-xs text-blue-800 mb-2">
            <strong>Example endpoint to implement later:</strong>
          </p>
          <code className="block bg-blue-100 p-2 rounded text-xs text-blue-900">
            POST /ai/cv/optimize
          </code>
          <p className="text-xs text-blue-700 mt-2">
            The backend reads your stored OpenAI key (encrypted at rest), calls OpenAI from the server,
            and returns the optimized CV content/suggestions.
          </p>
          <p className="text-xs text-blue-700 mt-2">
            <strong>Reason:</strong> This prevents API key exposure in the browser and keeps all 
            OpenAI usage server-side only.
          </p>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// Work Experience Modal Component
function WorkExperienceModal({
  mode,
  data,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  data?: UserWorkExperience;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<CreateWorkExperienceInput>({
    company: data?.company || '',
    role: data?.role || '',
    location: data?.location || '',
    startDate: data?.startDate ? data.startDate.split('T')[0] : '',
    endDate: data?.endDate ? data.endDate.split('T')[0] : '',
    isCurrent: data?.isCurrent || false,
    description: data?.description || '',
  });

  const handleSubmit = async () => {
    try {
      if (mode === 'create') {
        await api.createWorkExperience(formData);
        toast.success('Work experience added');
      } else if (data) {
        await api.updateWorkExperience(data.id, formData);
        toast.success('Work experience updated');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`${mode === 'create' ? 'Add' : 'Edit'} Work Experience`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
          <Input
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
          <Input
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <Input
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            maxLength={120}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <Input
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              disabled={formData.isCurrent}
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isCurrent"
            checked={formData.isCurrent}
            onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked, endDate: e.target.checked ? '' : formData.endDate })}
            className="mr-2"
          />
          <label htmlFor="isCurrent" className="text-sm text-gray-700">
            I currently work here
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={3000}
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.company || !formData.role || !formData.startDate}>
            {mode === 'create' ? 'Add' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Education Modal Component
function EducationModal({
  mode,
  data,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  data?: UserEducation;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<CreateEducationInput>({
    school: data?.school || '',
    degree: data?.degree || '',
    field: data?.field || '',
    startDate: data?.startDate ? data.startDate.split('T')[0] : '',
    endDate: data?.endDate ? data.endDate.split('T')[0] : '',
    description: data?.description || '',
  });

  const handleSubmit = async () => {
    try {
      if (mode === 'create') {
        await api.createEducation(formData);
        toast.success('Education added');
      } else if (data) {
        await api.updateEducation(data.id, formData);
        toast.success('Education updated');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`${mode === 'create' ? 'Add' : 'Edit'} Education`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">School *</label>
          <Input
            value={formData.school}
            onChange={(e) => setFormData({ ...formData, school: e.target.value })}
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
          <Input
            value={formData.degree || ''}
            onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
            maxLength={200}
            placeholder="e.g., Bachelor of Science"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
          <Input
            value={formData.field || ''}
            onChange={(e) => setFormData({ ...formData, field: e.target.value })}
            maxLength={200}
            placeholder="e.g., Computer Science"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <Input
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <Input
              type="date"
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={1500}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.school}>
            {mode === 'create' ? 'Add' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Skill Modal Component
function SkillModal({
  mode,
  data,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  data?: UserSkill;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<CreateSkillInput>({
    name: data?.name || '',
    level: data?.level || undefined,
    category: data?.category || '',
  });

  const handleSubmit = async () => {
    try {
      if (mode === 'create') {
        await api.createSkill(formData);
        toast.success('Skill added');
      } else if (data) {
        await api.updateSkill(data.id, formData);
        toast.success('Skill updated');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`${mode === 'create' ? 'Add' : 'Edit'} Skill`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            maxLength={80}
            placeholder="e.g., TypeScript"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Level (Optional)</label>
          <select
            value={formData.level || ''}
            onChange={(e) => setFormData({ ...formData, level: e.target.value as CvSkillLevel || undefined })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-600"
          >
            <option value="">Select level...</option>
            {SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category (Optional)</label>
          <Input
            value={formData.category || ''}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            maxLength={80}
            placeholder="e.g., Frontend, Backend, DevOps"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name}>
            {mode === 'create' ? 'Add' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Project Modal Component
function ProjectModal({
  mode,
  data,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit';
  data?: UserProject;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: data?.name || '',
    description: data?.description || '',
    link: data?.link || '',
    tech: data?.tech || [],
  });
  const [techInput, setTechInput] = useState('');

  const addTech = () => {
    if (techInput.trim() && !formData.tech?.includes(techInput.trim())) {
      setFormData({
        ...formData,
        tech: [...(formData.tech || []), techInput.trim()],
      });
      setTechInput('');
    }
  };

  const removeTech = (tech: string) => {
    setFormData({
      ...formData,
      tech: formData.tech?.filter((t) => t !== tech) || [],
    });
  };

  const handleSubmit = async () => {
    try {
      if (mode === 'create') {
        await api.createProject(formData);
        toast.success('Project added');
      } else if (data) {
        await api.updateProject(data.id, formData);
        toast.success('Project updated');
      }
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`${mode === 'create' ? 'Add' : 'Edit'} Project`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={1500}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Link (Optional)</label>
          <Input
            value={formData.link || ''}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            maxLength={300}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Technologies</label>
          <div className="flex gap-2">
            <Input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTech();
                }
              }}
              placeholder="Add technology..."
              maxLength={50}
            />
            <Button type="button" onClick={addTech}>
              Add
            </Button>
          </div>
          {formData.tech && formData.tech.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tech.map((tech, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-sm bg-navy-100 text-navy-900 px-3 py-1 rounded-full"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => removeTech(tech)}
                    className="text-navy-600 hover:text-navy-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name}>
            {mode === 'create' ? 'Add' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
