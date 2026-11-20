import type { Metadata } from "next";
import { LoginForm } from "@/src/modules/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in · LGallery" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : null} />;
}
