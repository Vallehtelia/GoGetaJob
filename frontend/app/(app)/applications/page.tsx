"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toast";
import { Plus, Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { JobApplication, ApplicationStatus } from "@/lib/types";

const STATUS_OPTIONS: ApplicationStatus[] = ['DRAFT', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'];

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; company: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'appliedAt'>('updatedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 10;

  // Fetch applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.getApplications({
        search: searchQuery || undefined,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        sortBy,
        order,
        page,
        pageSize,
      });

      setApplications(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalCount);
    } catch (error: any) {
      toast.error(error.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, sortBy, order, page]);

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await api.deleteApplication(id);
      toast.success("Application deleted successfully");
      setDeleteConfirm(null);
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete application");
    }
  };

  // Toggle status filter
  const toggleStatusFilter = (status: ApplicationStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setPage(1); // Reset to first page
  };

  // Calculate stats
  const stats = {
    total: totalCount,
    draft: applications?.filter((a) => a.status === "DRAFT").length || 0,
    applied: applications?.filter((a) => a.status === "APPLIED").length || 0,
    interview: applications?.filter((a) => a.status === "INTERVIEW").length || 0,
    offer: applications?.filter((a) => a.status === "OFFER").length || 0,
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Applications</h1>
          <p className="text-muted-foreground">
            Manage and track all your job applications
          </p>
        </div>
        <Link href="/applications/new">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Application
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Draft</p>
          <p className="text-2xl font-bold">{stats.draft}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Applied</p>
          <p className="text-2xl font-bold">{stats.applied}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Interview</p>
          <p className="text-2xl font-bold">{stats.interview}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Offers</p>
          <p className="text-2xl font-bold">{stats.offer}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company or position..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground mr-2">Filter by status:</span>
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                statusFilter.includes(status)
                  ? "bg-accent/20 text-accent border border-accent/50"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-muted rounded-lg px-3 py-1.5 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="updatedAt">Last Updated</option>
            <option value="createdAt">Date Created</option>
            <option value="appliedAt">Date Applied</option>
          </select>
          <button
            onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-sm transition-colors"
          >
            {order === "asc" ? "↑ Ascending" : "↓ Descending"}
          </button>
        </div>
      </Card>

      {/* Applications Table */}
      <Card>
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
          </div>
        ) : !applications || applications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-lg mb-4">No applications found</p>
            <Link href="/applications/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create your first application
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Company</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Position</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Applied</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Updated</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications?.map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4 font-medium">{app.company}</td>
                      <td className="p-4">{app.position}</td>
                      <td className="p-4">
                        <Badge variant={app.status.toLowerCase() as any}>
                          {app.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(app.appliedAt)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(app.updatedAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedApplication(app);
                              setIsModalOpen(true);
                            }}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/applications/${app.id}`)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({ id: app.id, company: app.company })
                            }
                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} • {totalCount} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Application Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Application Details`}
      >
        {selectedApplication && (
          <div className="space-y-4">
            {/* Company & Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Company</p>
                <p className="font-semibold text-lg">{selectedApplication.company}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Position</p>
                <p className="font-semibold text-lg">{selectedApplication.position}</p>
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Badge variant={selectedApplication.status.toLowerCase() as any}>
                {selectedApplication.status}
              </Badge>
            </div>

            {/* Link */}
            {selectedApplication.link && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Job Posting</p>
                <a
                  href={selectedApplication.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline flex items-center gap-2"
                >
                  {selectedApplication.link}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Applied Date</p>
                <p>{formatDate(selectedApplication.appliedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Contact</p>
                <p>{formatDate(selectedApplication.lastContactAt)}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{formatDate(selectedApplication.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                <p className="text-sm">{formatDate(selectedApplication.updatedAt)}</p>
              </div>
            </div>

            {/* Notes */}
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                <p className="text-foreground whitespace-pre-wrap">
                  {selectedApplication.notes || "No notes available"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Application"
        message={`Are you sure you want to delete the application for ${deleteConfirm?.company}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
