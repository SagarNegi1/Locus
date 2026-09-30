"use client";

import { motion } from "motion/react";
import { ScanText } from "lucide-react";

export interface ProcessingTask {
  filename: string;
  status: string;
  statusColor: string;
  progress: number;
  detail: string;
  active: boolean;
}

export interface ProcessingTrackerProps {
  tasks: ProcessingTask[];
}

export default function ProcessingTracker({ tasks }: ProcessingTrackerProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="lg:col-span-1 bg-surface rounded-xl border border-document-border p-6 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <ScanText className="w-5 h-5 text-secondary" />
        <h2 className="text-headline-md text-on-surface">Active Processing</h2>
      </div>

      {/* Task Cards */}
      <div className="flex flex-col gap-4">
        {tasks.map((task, i) => (
          <motion.div
            key={task.filename}
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
            className={`p-4 rounded-lg border border-document-border ${task.active
                ? "bg-surface-container-low"
                : "bg-surface opacity-60"
              }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-body-sm font-semibold text-on-surface truncate pr-2">
                {task.filename}
              </span>
              <span className={`text-citation-code ${task.statusColor} shrink-0`}>
                {task.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-document-border rounded-full h-1.5 mb-2 overflow-hidden">
              {task.progress > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                  className="bg-secondary h-1.5 rounded-full"
                />
              )}
            </div>

            <p className="text-label-caps text-on-surface-variant">
              {task.detail}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
