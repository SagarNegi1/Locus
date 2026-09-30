"use client";

import { Joyride } from "react-joyride";

interface CitationTourProps {
  run: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCallback: (data: any) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JoyrideComponent = Joyride as any;

export default function CitationTour({ run, onCallback }: CitationTourProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const steps: any[] = [
    {
      target: ".tour-timeline-card",
      content: "The AI extracts structured facts.",
      disableBeacon: true,
      placement: "right",
    },
    {
      target: ".tour-pdf-viewer",
      content: "But it doesn't just guess. It mathematically maps the fact to the source.",
      placement: "left",
    },
    {
      target: ".tour-pdf-viewer",
      content: "Clicking a fact highlights the exact pixels it was extracted from, ensuring 100% verifiability.",
      placement: "left",
    },
  ];

  return (
    <JoyrideComponent
      steps={steps}
      run={run}
      callback={onCallback}
      continuous
      hideCloseButton
      showSkipButton
      showProgress
      styles={
        {
          options: {
            zIndex: 10000,
            primaryColor: "#2563eb",
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
      }
    />
  );
}
