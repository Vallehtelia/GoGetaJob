"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminFeedbackItem, FeedbackType, PaginationMeta } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/Toast";
import { Modal } from "@/components/ui/Modal";

type Sort = "newest" | "oldest";

export default function AdminFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<AdminFeedbackItem | null>(null);

  const [type, setType] = useState<"" | FeedbackType>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState<Sort>("newest");

  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize,
    totalItems: 0,
    totalPages: 1,
  });

  const queryParams = useMemo(
    () => ({
      type: type || undefined,
      q: q.trim() || undefined,
      page,
      pageSize,
      sort,
    }),
    [type, q, page, pageSize, sort]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setForbidden(false);

    api.adminListFeedback(queryParams)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setPagination(res.pagination);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const errorData = err?.errorData || err;
        if (errorData?.statusCode === 403) {
          setForbidden(true);
        } else if (errorData?.statusCode === 429) {
          toast.error("You’re sending requests too quickly. Please wait and try again.");
        } else {
          toast.error(errorData?.message || err.message || "Failed to load feedback");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryParams]);

  if (forbidden) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Forbidden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">You do not have access to the admin area.</p>
          <Link href="/dashboard" className="text-accent hover:underline">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = async (label: string, value: string | null | undefined) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedback Inbox</h1>
          <p className="text-muted-foreground">Admin-only view of all submitted feedback.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            className="flex w-full md:w-48 rounded-xl border border-border bg-background px-4 py-2 text-sm"
            value={type}
            onChange={(e) => {
              setPage(1);
              setType(e.target.value as any);
            }}
            disabled={loading}
          >
            <option value="">All types</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="other">Other</option>
          </select>

          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search message…"
            disabled={loading}
          />

          <select
            className="flex w-full md:w-40 rounded-xl border border-border bg-background px-4 py-2 text-sm"
            value={sort}
            onChange={(e) => {
              setPage(1);
              setSort(e.target.value as Sort);
            }}
            disabled={loading}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>

          <Button
            variant="secondary"
            onClick={() => {
              setPage(1);
            }}
            disabled={loading}
          >
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Results ({pagination.totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">No feedback found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Page</th>
                    <th className="py-2 pr-4">Message</th>
                    <th className="py-2 pr-0 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr
                      key={it.id}
                      className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
                      onClick={() => setSelectedFeedback(it)}
                    >
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(it.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">{it.type}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{it.user.email}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{it.pagePath || "-"}</td>
                      <td className="py-2 pr-4">
                        <span className="block max-w-[700px] truncate" title={it.message}>
                          {it.message}
                        </span>
                      </td>
                      <td className="py-2 pr-0 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFeedback(it);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || pagination.page <= 1}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={loading || pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        title="Feedback details"
        size="lg"
      >
        {selectedFeedback && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {selectedFeedback.type.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedFeedback.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard("User ID", selectedFeedback.user.id)}
                >
                  Copy userId
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard("Page path", selectedFeedback.pagePath || "")}
                  disabled={!selectedFeedback.pagePath}
                >
                  Copy page
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard("Message", selectedFeedback.message)}
                >
                  Copy message
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground mb-1">User</div>
                <div className="text-sm font-medium">{selectedFeedback.user.email}</div>
                <div className="text-xs text-muted-foreground mt-1 break-all">{selectedFeedback.user.id}</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs text-muted-foreground mb-1">Page path</div>
                <div className="text-sm break-all">{selectedFeedback.pagePath || "-"}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs text-muted-foreground mb-2">Message</div>
              <div className="max-h-[50vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed m-0">
                  {selectedFeedback.message}
                </pre>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs text-muted-foreground mb-2">User agent</div>
              <div className="max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap break-words text-xs m-0 text-muted-foreground">
                  {selectedFeedback.userAgent || "-"}
                </pre>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedFeedback(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

