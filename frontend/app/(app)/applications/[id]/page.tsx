"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import type { ApplicationStatus, JobApplication } from "@/lib/types";

export default function EditApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<JobApplication | null>(null);

  // Load application
  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const data = await api.getApplication(id);
        console.log('Loaded application data:', data);
        
        // Transform data for form - keep dates as ISO strings for proper display
        const transformedData: JobApplication = {
          id: data.id,
          userId: data.userId,
          company: data.company,
          position: data.position,
          link: data.link || '',
          status: data.status,
          appliedAt: data.appliedAt || '',
          lastContactAt: data.lastContactAt || '',
          notes: data.notes || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        console.log('Transformed form data:', transformedData);
        setFormData(transformedData);
      } catch (error: any) {
        console.error('Failed to load application:', error);
        toast.error(error.message || "Failed to load application");
        router.push("/applications");
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id, router]);

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
      // Convert date strings to ISO format
      const appliedAtISO = formData.appliedAt 
        ? new Date(formData.appliedAt).toISOString() 
        : null;
      const lastContactAtISO = formData.lastContactAt 
        ? new Date(formData.lastContactAt).toISOString() 
        : null;

      await api.updateApplication(id, {
        company: formData.company,
        position: formData.position,
        link: formData.link || null,
        status: formData.status,
        appliedAt: appliedAtISO,
        lastContactAt: lastContactAtISO,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!formData) {
    return null;
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
    </div>
  );
}
