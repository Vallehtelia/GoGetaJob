"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function SettingsPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState("http://localhost:3000");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application preferences
        </p>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiUrl">Backend API URL</Label>
            <Input
              id="apiUrl"
              type="url"
              placeholder="http://localhost:3000"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The base URL for the GoGetaJob backend API
            </p>
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>

      {/* Profile Settings Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Profile management coming soon in Phase 2B...
          </p>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Theme</p>
              <p className="text-sm text-muted-foreground">
                GoGetaJob uses a sleek dark navy theme by default
              </p>
            </div>
            <div className="w-12 h-6 rounded-full gradient-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Theme customization coming in a future update
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
