"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, TrendingUp, Calendar, Target } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { label: "Total Applications", value: "42", icon: Briefcase, trend: "+5 this week" },
    { label: "Interviews", value: "8", icon: Calendar, trend: "+2 this week" },
    { label: "Offers", value: "2", icon: Target, trend: "Congratulations!" },
    { label: "Response Rate", value: "65%", icon: TrendingUp, trend: "+12% vs last month" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your job search progress and statistics
        </p>
      </div>

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
