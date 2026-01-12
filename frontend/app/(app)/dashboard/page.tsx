"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Briefcase, TrendingUp, Calendar, Target, User, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const stats = [
    { label: "Total Applications", value: "42", icon: Briefcase, trend: "+5 this week" },
    { label: "Interviews", value: "8", icon: Calendar, trend: "+2 this week" },
    { label: "Offers", value: "2", icon: Target, trend: "Congratulations!" },
    { label: "Response Rate", value: "65%", icon: TrendingUp, trend: "+12% vs last month" },
  ];

  useEffect(() => {
    loadProfile();
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

  const completeness = calculateProfileCompleteness(profile);

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
        {stats.map((stat) => {
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
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { company: "TechCorp", position: "Senior Developer", status: "interview" },
              { company: "StartupXYZ", position: "Full Stack Engineer", status: "applied" },
              { company: "BigTech Inc", position: "Backend Developer", status: "offer" },
            ].map((app, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div>
                  <h3 className="font-medium">{app.company}</h3>
                  <p className="text-sm text-muted-foreground">{app.position}</p>
                </div>
                <Badge variant={app.status as any}>{app.status.toUpperCase()}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
