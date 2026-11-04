"use client";


type PageTrackerProps = {
  funnelName: string;
  stepName?: string;
};

// Compatibility marker: root PublicTrafficTracker now owns navigation emission.
// Keeping the component avoids changing every existing public mount.
export function PageTracker(_props: PageTrackerProps) {
  return null;
}
