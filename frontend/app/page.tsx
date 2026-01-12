import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to login for now (will add proper auth check later)
  redirect("/login");
}
