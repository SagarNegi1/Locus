"use client";

import { motion } from "motion/react";
import { FileText } from "lucide-react";

export interface TimelineEvent {
  date: string;
  category: string;
  categoryColor: string;
  fact: string;
  source: string;
  citation: string;
}
export interface TimelineSectionProps { events: TimelineEvent[]; showHeader?: boolean; }

export default function TimelineSection({ events, showHeader = true }: TimelineSectionProps) {
  return (
    <section className="health-timeline" aria-label="Health timeline">
      {showHeader && <div className="timeline-heading"><p className="eyebrow">A connected history</p><h2>Your health timeline</h2><p>Details from your uploaded documents, in order.</p></div>}
      <div className="timeline-list">{events.map((event, index) => (
        <motion.article key={event.date + event.category + index} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.24) }} className="timeline-entry">
          <div className="timeline-date">{event.date}</div>
          <span className="timeline-node" aria-hidden="true" />
          <div className="timeline-detail"><div className="timeline-category">{event.category.toLowerCase()}</div><h3>{event.fact}</h3><p>{event.citation}</p><span className="timeline-source"><FileText size={12} />{event.source === "Master Timeline" ? "From your uploaded records" : event.source}</span></div>
        </motion.article>
      ))}</div>
    </section>
  );
}
