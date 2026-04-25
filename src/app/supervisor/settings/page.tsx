"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SupervisorSettingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/supervisor");
  }, [router]);
  return null;
}
