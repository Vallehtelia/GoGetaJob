"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Briefcase, TrendingUp, Calendar, Target, User, CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { UserProfile, JobApplication } from "@/lib/types";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadApplications();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const response = await api.getApplications();
      setApplications(response.data);
    } catch (error) {
      console.error("Failed to load applications:", error);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const calculateProfileCompleteness = (profile: UserProfile | null): number => {
    if (!profile) return 0;
    
    const fields = [
      profile.firstName,
      profile.lastName,
      profile.phone,
      profile.location,
      profile.headline,
      profile.summary,
      profile.linkedinUrl,
      profile.githubUrl,
      profile.websiteUrl,
    ];

    const filledFields = fields.filter((field) => field && field.trim().length > 0).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const calculateStats = () => {
    const total = applications.length;
    const interviews = applications.filter(app => app.status === 'INTERVIEW').length;
    const offers = applications.filter(app => app.status === 'OFFER').length;
    const applied = applications.filter(app => app.status === 'APPLIED').length;
    
    // Calculate applications from last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeek = applications.filter(app => 
      new Date(app.createdAt) > oneWeekAgo
    ).length;

    // Calculate interviews from last week
    const interviewsThisWeek = applications.filter(app => 
      app.status === 'INTERVIEW' && new Date(app.updatedAt) > oneWeekAgo
    ).length;

    // Calculate response rate (non-draft applications that have progressed)
    const nonDraft = applications.filter(app => app.status !== 'DRAFT').length;
    const responded = applications.filter(app => 
      app.status === 'INTERVIEW' || app.status === 'OFFER' || app.status === 'REJECTED'
    ).length;
    const responseRate = nonDraft > 0 ? Math.round((responded / nonDraft) * 100) : 0;

    return {
      total,
      interviews,
      offers,
      responseRate,
      thisWeek,
      interviewsThisWeek,
    };
  };

  const stats = calculateStats();
  const completeness = calculateProfileCompleteness(profile);

  const statsDisplay = [
    { 
      label: "Total Applications", 
      value: stats.total.toString(), 
      icon: Briefcase, 
      trend: stats.thisWeek > 0 ? `+${stats.thisWeek} this week` : 'No new applications this week'
    },
    { 
      label: "Interviews", 
      value: stats.interviews.toString(), 
      icon: Calendar, 
      trend: stats.interviewsThisWeek > 0 ? `+${stats.interviewsThisWeek} this week` : 'Keep applying!'
    },
    { 
      label: "Offers", 
      value: stats.offers.toString(), 
      icon: Target, 
      trend: stats.offers > 0 ? 'Congratulations!' : 'Keep pushing!'
    },
    { 
      label: "Response Rate", 
      value: `${stats.responseRate}%`, 
      icon: TrendingUp, 
      trend: stats.responseRate > 50 ? 'Great rate!' : 'Keep applying'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your job search progress and statistics
        </p>
      </div>

      {/* Profile Completeness Widget */}
      {!profileLoading && completeness < 100 && (
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-lg">Complete Your Profile</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  A complete profile helps you stand out to employers. You&apos;re {completeness}% there!
                </p>
                
                {/* Progress bar */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                
                <Link href="/settings">
                  <Button size="sm" className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Complete Profile
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent">{completeness}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {applicationsLoading ? (
          // Loading skeletons
          Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          statsDisplay.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Applications</CardTitle>
          <Link href="/applications">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {applicationsLoading ? (
            // Loading skeleton
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-5 w-32 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your job applications to see your progress here
              </p>
              <Link href="/applications">
                <Button>
                  Add Your First Application
                </Button>
              </Link>
            </div>
          ) : (
            // Recent applications (last 5, sorted by most recent)
            <div className="space-y-4">
              {applications
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((app) => (
                  <Link key={app.id} href={`/applications/${app.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                      <div>
                        <h3 className="font-medium">{app.company}</h3>
                        <p className="text-sm text-muted-foreground">{app.position}</p>
                        {app.appliedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={app.status.toLowerCase() as any}>
                        {app.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
