"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "react-bootstrap";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="container py-5 text-center" style={{ minHeight: "60vh" }}>
      <h1 className="display-6 fw-bold">Page not found</h1>
      <p className="text-muted mb-4">
        This URL is not valid or the page was removed. Use the links below to continue.
      </p>
      <div className="d-flex gap-2 justify-content-center flex-wrap">
        <Button variant="primary" type="button" onClick={() => router.back()}>
          Go back
        </Button>
        <Link href="/storekeeper" className="btn btn-outline-primary">
          Storekeeper home
        </Link>
        <Link href="/supervisor" className="btn btn-outline-primary">
          Supervisor home
        </Link>
        <Link href="/admin" className="btn btn-outline-primary">
          Admin home
        </Link>
        <Link href="/home" className="btn btn-outline-secondary">
          App home
        </Link>
        <Link href="/" className="btn btn-outline-secondary">
          Login
        </Link>
      </div>
    </div>
  );
}
