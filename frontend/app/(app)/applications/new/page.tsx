"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import type { ApplicationStatus } from "@/lib/types";

export default function NewApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    company: "",
    position: "",
    link: "",
    status: "APPLIED" as ApplicationStatus,
    appliedAt: "",
    lastContactAt: "",
    notes: "",
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company.trim()) {
      newErrors.company = "Company is required";
    }
    if (!formData.position.trim()) {
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

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);

    try {
      // Convert date strings to ISO format
      const appliedAtISO = formData.appliedAt 
        ? new Date(formData.appliedAt).toISOString() 
        : undefined;
      const lastContactAtISO = formData.lastContactAt 
        ? new Date(formData.lastContactAt).toISOString() 
        : undefined;

      await api.createApplication({
        company: formData.company,
        position: formData.position,
        link: formData.link || undefined,
        status: formData.status,
        appliedAt: appliedAtISO,
        lastContactAt: lastContactAtISO,
        notes: formData.notes || undefined,
      });

      toast.success("Application created successfully!");
      router.push("/applications");
    } catch (error: any) {
      toast.error(error.message || "Failed to create application");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold mb-2">New Application</h1>
        <p className="text-muted-foreground">
          Add a new job application to track
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
                  disabled={loading}
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
                  disabled={loading}
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
                value={formData.link}
                onChange={(e) => {
                  setFormData({ ...formData, link: e.target.value });
                  if (errors.link) setErrors({ ...errors, link: "" });
                }}
                disabled={loading}
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
                  disabled={loading}
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
                  value={formData.appliedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, appliedAt: e.target.value })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastContactAt">Last Contact Date</Label>
              <Input
                id="lastContactAt"
                type="date"
                value={formData.lastContactAt}
                onChange={(e) =>
                  setFormData({ ...formData, lastContactAt: e.target.value })
                }
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                When did you last hear from them?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={6}
                placeholder="Add any notes about the application, interview details, salary expectations, etc."
                value={formData.notes}
                onChange={(e) => {
                  setFormData({ ...formData, notes: e.target.value });
                  if (errors.notes) setErrors({ ...errors, notes: "" });
                }}
                className="flex w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
                disabled={loading}
                maxLength={10000}
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">
                  You can update this later as you progress through the interview process
                </p>
                <p className="text-xs text-muted-foreground">
                  {formData.notes.length}/10,000
                </p>
              </div>
              {errors.notes && (
                <p className="text-sm text-red-400">{errors.notes}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Creating..." : "Create Application"}
              </Button>
              <Link href="/applications">
                <Button type="button" variant="secondary" size="lg" disabled={loading}>
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
