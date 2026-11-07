import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/snapplus")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
