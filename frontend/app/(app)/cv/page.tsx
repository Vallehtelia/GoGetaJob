"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toast";
import { Plus, FileText, Star, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CvDocument } from "@/lib/types";

export default function CVListPage() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CvDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCvTitle, setNewCvTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Fetch CVs
  const fetchCvs = async () => {
    try {
      setLoading(true);
      const data = await api.listCvs();
      setCvs(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load CVs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCvs();
  }, []);

  // Create CV
  const handleCreate = async () => {
    try {
      const cv = await api.createCv({ title: newCvTitle || undefined });
      toast.success("CV created successfully");
      setIsCreateModalOpen(false);
      setNewCvTitle("");
      router.push(`/cv/${cv.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create CV");
    }
  };

  // Delete CV
  const handleDelete = async (id: string) => {
    try {
      await api.deleteCv(id);
      toast.success("CV deleted successfully");
      setDeleteConfirm(null);
      fetchCvs();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete CV");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-navy-900">My CVs</h1>
            <p className="text-gray-600 mt-1">
              Create and manage your CV documents
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New CV
          </Button>
        </div>

        {/* CVs Grid */}
        {cvs.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No CVs yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first CV to get started
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create CV
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cvs.map((cv) => (
              <Card
                key={cv.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/cv/${cv.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-navy-600" />
                    {cv.isDefault && (
                      <Star className="w-5 h-5 text-pink-500 fill-pink-500" />
                    )}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/cv/${cv.id}`);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ id: cv.id, title: cv.title });
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-navy-900 mb-2">
                  {cv.title}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="default" className="text-xs">
                    {cv.template}
                  </Badge>
                  {cv.isDefault && (
                    <Badge variant="default" className="text-xs bg-pink-100 text-pink-700">
                      Default
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600">
                  Last updated {formatDate(cv.updatedAt)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create CV Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNewCvTitle("");
        }}
        title="Create New CV"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CV Title
            </label>
            <Input
              value={newCvTitle}
              onChange={(e) => setNewCvTitle(e.target.value)}
              placeholder="e.g., Software Engineer CV"
              maxLength={120}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank for default title &ldquo;Main CV&rdquo;
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewCvTitle("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create CV
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Delete CV"
          message={`Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          isDestructive={true}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}
