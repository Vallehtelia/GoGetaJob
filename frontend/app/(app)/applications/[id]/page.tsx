"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ArrowLeft, Loader2, FileText, Eye, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import type { ApplicationStatus, JobApplication, CvSnapshot, CvDocument } from "@/lib/types";

export default function EditApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<JobApplication | null>(null);

  // Snapshot state
  const [snapshot, setSnapshot] = useState<CvSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [cvs, setCvs] = useState<CvDocument[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [showSnapshotDialog, setShowSnapshotDialog] = useState<'create' | 'recreate' | 'delete' | null>(null);

  // Load application and snapshot
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [appData, cvsData] = await Promise.all([
          api.getApplication(id),
          api.listCvs(),
        ]);
        
        // Transform data for form
        const transformedData: JobApplication = {
          id: appData.id,
          userId: appData.userId,
          company: appData.company,
          position: appData.position,
          link: appData.link || '',
          status: appData.status,
          appliedAt: appData.appliedAt || '',
          lastContactAt: appData.lastContactAt || '',
          notes: appData.notes || '',
          createdAt: appData.createdAt,
          updatedAt: appData.updatedAt,
        };
        
        setFormData(transformedData);
        setCvs(cvsData);

        // Try to load snapshot
        try {
          const snapshotData = await api.getApplicationSnapshot(id);
          setSnapshot(snapshotData);
        } catch {
          setSnapshot(null);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load application");
        router.push("/applications");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const loadSnapshot = async () => {
    try {
      setLoadingSnapshot(true);
      const snapshotData = await api.getApplicationSnapshot(id);
      setSnapshot(snapshotData);
    } catch {
      setSnapshot(null);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!selectedCvId) {
      toast.error('Please select a CV');
      return;
    }

    try {
      setLoadingSnapshot(true);
      await api.createApplicationSnapshot(id, selectedCvId);
      toast.success('CV snapshot created successfully');
      setShowSnapshotDialog(null);
      setSelectedCvId('');
      loadSnapshot();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create snapshot');
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async () => {
    try {
      setLoadingSnapshot(true);
      await api.deleteApplicationSnapshot(id);
      toast.success('Snapshot deleted');
      setSnapshot(null);
      setShowSnapshotDialog(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete snapshot');
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const validateForm = () => {
    if (!formData) return false;

    const newErrors: Record<string, string> = {};

    if (!formData.company?.trim()) {
      newErrors.company = "Company is required";
    }
    if (!formData.position?.trim()) {
      newErrors.position = "Position is required";
    }
    if (formData.link && !isValidUrl(formData.link)) {
      newErrors.link = "Please enter a valid URL";
    }
    if (formData.notes && formData.notes.length > 10000) {
      newErrors.notes = "Notes must be less than 10,000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData || !validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setSaving(true);
    try {
      await api.updateApplication(id, {
        company: formData.company,
        position: formData.position,
        link: formData.link || null,
        status: formData.status,
        appliedAt: formData.appliedAt || null,
        lastContactAt: formData.lastContactAt || null,
        notes: formData.notes || null,
      });

      toast.success("Application updated successfully!");
      router.push("/applications");
    } catch (error: any) {
      toast.error(error.message || "Failed to update application");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back button */}
      <Link href="/applications">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold mb-2">Edit Application</h1>
        <p className="text-muted-foreground">
          Update your job application details
        </p>
      </div>

      {/* Application Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  placeholder="e.g. TechCorp"
                  value={formData.company}
                  onChange={(e) => {
                    setFormData({ ...formData, company: e.target.value });
                    if (errors.company) setErrors({ ...errors, company: "" });
                  }}
                  disabled={saving}
                />
                {errors.company && (
                  <p className="text-sm text-red-400">{errors.company}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  placeholder="e.g. Senior Developer"
                  value={formData.position}
                  onChange={(e) => {
                    setFormData({ ...formData, position: e.target.value });
                    if (errors.position) setErrors({ ...errors, position: "" });
                  }}
                  disabled={saving}
                />
                {errors.position && (
                  <p className="text-sm text-red-400">{errors.position}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Job Posting URL</Label>
              <Input
                id="link"
                type="url"
                placeholder="https://company.com/jobs/123"
                value={formData.link || ""}
                onChange={(e) => {
                  setFormData({ ...formData, link: e.target.value });
                  if (errors.link) setErrors({ ...errors, link: "" });
                }}
                disabled={saving}
              />
              {errors.link && (
                <p className="text-sm text-red-400">{errors.link}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as ApplicationStatus })
                  }
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  disabled={saving}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="APPLIED">Applied</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="OFFER">Offer</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appliedAt">Applied Date</Label>
                <Input
                  id="appliedAt"
                  type="date"
                  value={
                    formData.appliedAt 
                      ? (formData.appliedAt.includes('T') 
                          ? formData.appliedAt.split('T')[0] 
                          : formData.appliedAt)
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, appliedAt: e.target.value })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastContactAt">Last Contact Date</Label>
              <Input
                id="lastContactAt"
                type="date"
                value={
                  formData.lastContactAt 
                    ? (formData.lastContactAt.includes('T') 
                        ? formData.lastContactAt.split('T')[0] 
                        : formData.lastContactAt)
                    : ""
                }
                onChange={(e) =>
                  setFormData({ ...formData, lastContactAt: e.target.value })
                }
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                When did you last hear from them?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={8}
                placeholder="Add any notes about the application, interview details, salary expectations, etc."
                value={formData.notes || ""}
                onChange={(e) => {
                  setFormData({ ...formData, notes: e.target.value });
                  if (errors.notes) setErrors({ ...errors, notes: "" });
                }}
                className="flex w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
                disabled={saving}
                maxLength={10000}
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">
                  Track your progress through the interview process
                </p>
                <p className="text-xs text-muted-foreground">
                  {(formData.notes || "").length}/10,000
                </p>
              </div>
              {errors.notes && (
                <p className="text-sm text-red-400">{errors.notes}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Link href="/applications">
                <Button type="button" variant="secondary" size="lg" disabled={saving}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* CV Snapshot Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              CV Snapshot
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSnapshot ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : snapshot ? (
            // Snapshot exists
            <div className="space-y-4">
              <div className="bg-navy-50 border border-navy-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-navy-900">
                      {snapshot.title}
                    </h4>
                    <p className="text-sm text-gray-700">
                      Template: {snapshot.template}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Created: {new Date(snapshot.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="bg-navy-100 px-3 py-1 rounded-full">
                    <span className="text-xs font-medium text-navy-800">Immutable</span>
                  </div>
                </div>

                <div className="text-xs text-gray-600 mt-3 bg-blue-50 border border-blue-200 rounded p-2">
                  💡 This snapshot is a frozen copy of your CV at the time you applied. 
                  It won&apos;t change even if you update your profile or library.
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/applications/${id}/snapshot`)}
                  variant="primary"
                  size="md"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Snapshot
                </Button>
                <Button
                  onClick={() => setShowSnapshotDialog('recreate')}
                  variant="secondary"
                  size="md"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recreate
                </Button>
                <Button
                  onClick={() => setShowSnapshotDialog('delete')}
                  variant="danger"
                  size="md"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            // No snapshot
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No CV snapshot attached yet. Create a snapshot to preserve the exact version of your CV used for this application.
              </p>

              <div className="space-y-3">
                <Label htmlFor="cvSelect">Select CV to Snapshot</Label>
                {cvs.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      You don&apos;t have any CVs yet.{' '}
                      <Link href="/cv" className="font-semibold underline">
                        Create your first CV
                      </Link>{' '}
                      to create a snapshot.
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      id="cvSelect"
                      value={selectedCvId}
                      onChange={(e) => setSelectedCvId(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Choose a CV...</option>
                      {cvs.map((cv) => (
                        <option key={cv.id} value={cv.id}>
                          {cv.title} {cv.isDefault && '(Default)'}
                        </option>
                      ))}
                    </select>

                    <Button
                      onClick={() => setShowSnapshotDialog('create')}
                      disabled={!selectedCvId || loadingSnapshot}
                      size="md"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {loadingSnapshot ? 'Creating...' : 'Create Snapshot'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      {showSnapshotDialog === 'create' && (
        <ConfirmDialog
          isOpen={true}
          title="Create CV Snapshot"
          message={`Create an immutable snapshot of "${cvs.find(cv => cv.id === selectedCvId)?.title}" for this application? This will preserve your CV exactly as it is now.`}
          confirmLabel="Create Snapshot"
          onConfirm={handleCreateSnapshot}
          onCancel={() => setShowSnapshotDialog(null)}
        />
      )}

      {showSnapshotDialog === 'recreate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSnapshotDialog(null)} />
          <Card className="relative max-w-lg w-full mx-4">
            <CardHeader>
              <CardTitle>Recreate CV Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a CV to create a new snapshot. This will replace the existing snapshot.
              </p>

              <div className="space-y-2">
                <Label htmlFor="recreateCvSelect">Select CV</Label>
                <select
                  id="recreateCvSelect"
                  value={selectedCvId}
                  onChange={(e) => setSelectedCvId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Choose a CV...</option>
                  {cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.title} {cv.isDefault && '(Default)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowSnapshotDialog(null);
                    setSelectedCvId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSnapshot}
                  disabled={!selectedCvId || loadingSnapshot}
                >
                  {loadingSnapshot ? 'Creating...' : 'Recreate Snapshot'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showSnapshotDialog === 'delete' && (
        <ConfirmDialog
          isOpen={true}
          title="Delete CV Snapshot"
          message="Are you sure you want to delete this CV snapshot? This action cannot be undone."
          confirmLabel="Delete"
          isDestructive={true}
          onConfirm={handleDeleteSnapshot}
          onCancel={() => setShowSnapshotDialog(null)}
        />
      )}
    </div>
  );
}
