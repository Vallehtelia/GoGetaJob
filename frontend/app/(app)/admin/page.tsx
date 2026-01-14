"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminAnalyticsOverview } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/Toast";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setForbidden(false);

    api.adminGetAnalyticsOverview(7)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const errorData = err?.errorData || err;
        if (errorData?.statusCode === 403) {
          setForbidden(true);
        } else {
          toast.error(errorData?.message || err.message || "Failed to load analytics");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Activity analytics (last 7 days).</p>
        </div>
        <Link href="/admin/feedback">
          <Button variant="secondary">Feedback Inbox</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data ? (
        <p className="text-muted-foreground">No data.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>DAU (today)</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{data.today.dau}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sessions (today)</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{data.today.sessions}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Page views (today)</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{data.today.pageViews}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Avg session (today)</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {Math.round(data.today.avgSessionSeconds / 60)}m
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>7-day series</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">DAU</th>
                      <th className="py-2 pr-4">Sessions</th>
                      <th className="py-2 pr-4">Page views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.series.map((d) => (
                      <tr key={d.date} className="border-b border-border/60">
                        <td className="py-2 pr-4 whitespace-nowrap">{d.date}</td>
                        <td className="py-2 pr-4">{d.dau}</td>
                        <td className="py-2 pr-4">{d.sessions}</td>
                        <td className="py-2 pr-4">{d.pageViews}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

